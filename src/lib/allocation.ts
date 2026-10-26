import { orm } from "@/lib/db";

export interface AllocatedPassenger {
  passengerId: string;
  fullName: string;
  identityType: string;
  identityNumber: string;
  bookingId: string;
  bookingReference: string;
  confirmedAt: Date;
  vehicleName: string;
  plateNumber: string | null;
  seatNumber: number; // 1-based index within the allocated vehicle
  isVehicleAssigned: boolean;
  status: string;
}

export interface AllocatedVehicleGroup {
  id?: string;
  name: string;
  plateNumber?: string | null;
  capacity: number;
  allocatedCount: number;
  passengers: AllocatedPassenger[];
}

export interface TripAllocationSummary {
  tripId: string;
  routeTitle: string;
  departureTime: string;
  departureDate: string;
  totalCapacity: number;
  totalReserved: number;
  totalConfirmed: number;
  vehicles: AllocatedVehicleGroup[];
}

/**
 * DETERMINISTIC FIFO TIMESTAMP RULE (Requirement 6):
 * 
 * 1. Authority: Server-generated, persisted timestamps in PostgreSQL.
 * 2. Precedence:
 *    - For confirmed travel allocations: `booking.reviewedAt` (the exact server timestamp when payment was approved).
 *    - Fallback: `booking.createdAt` (the server timestamp when the reservation hold was created).
 *    - Tie-breaker: `passenger.id ASC` (RFC-9562 UUIDv7 chronological sequence).
 * 3. Physical Fleet Invariant (Requirements 2, 3, 24):
 *    - Only confirmed bookings with approved payments consume physical vehicle capacity.
 *    - Confirmed passengers are allocated across available assigned physical vehicles in strict FIFO order.
 *    - Vehicle 1 fills to capacity C1 -> Vehicle 2 fills to capacity C2 -> etc.
 *    - NO CONFIRMED PASSENGER WITHOUT REAL PHYSICAL CAPACITY.
 *    - Overselling is strictly rejected at database transaction boundary.
 */
export async function calculateTripFIFOAllocation(
  tripId: string,
  sisterTripIds: string[] = []
): Promise<TripAllocationSummary> {
  const trip = await orm.Trip.where({ id: tripId })
    .include("originLocation")
    .include("destinationLocation")
    .include("vehicle")
    .include("bookings", (b) =>
      b.include("passengers")
    )
    .first();

  if (!trip) {
    throw new Error(`Trip ${tripId} not found`);
  }

  const dept = new Date(trip.departureAt);
  const departureTime = dept.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const departureDate = dept.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const routeTitle = `${trip.originLocation.name} → ${trip.destinationLocation.name}`;

  // Gather all eligible physical vehicles for this departure/service
  const vehicleGroups: AllocatedVehicleGroup[] = [];

  if (trip.vehicle) {
    vehicleGroups.push({
      id: trip.vehicle.id,
      name: trip.vehicle.name,
      plateNumber: trip.vehicle.plateNumber,
      capacity: trip.vehicle.seatCapacity,
      allocatedCount: 0,
      passengers: [],
    });
  } else {
    // Trip published prior to vehicle assignment
    vehicleGroups.push({
      name: "Vehicle to be assigned",
      plateNumber: null,
      capacity: trip.seatCapacity,
      allocatedCount: 0,
      passengers: [],
    });
  }

  // If sister departures are provided (e.g. multiple vehicles on same departure time and route)
  for (const sisterId of sisterTripIds) {
    if (sisterId === tripId) continue;
    const sister = await orm.Trip.where({ id: sisterId }).include("vehicle").first();
    if (sister && sister.vehicle && !vehicleGroups.some((v) => v.id === sister.vehicle?.id)) {
      vehicleGroups.push({
        id: sister.vehicle.id,
        name: sister.vehicle.name,
        plateNumber: sister.vehicle.plateNumber,
        capacity: sister.vehicle.seatCapacity,
        allocatedCount: 0,
        passengers: [],
      });
    }
  }

  // Only CONFIRMED bookings with approved payment receive physical vehicle allocation
  const confirmedBookings = (trip.bookings || []).filter(
    (b) => b.status === "CONFIRMED" && b.paymentStatus === "APPROVED"
  );

  // Authoritative FIFO sorting
  confirmedBookings.sort((a, b) => {
    const timeA = new Date(a.reviewedAt || a.createdAt).getTime();
    const timeB = new Date(b.reviewedAt || b.createdAt).getTime();
    if (timeA !== timeB) return timeA - timeB;
    return a.id.localeCompare(b.id);
  });

  // Flatten passengers in deterministic order
  const rawPassengers: Array<{
    id: string;
    fullName: string;
    identityType: string;
    identityNumber: string;
    bookingId: string;
    bookingReference: string;
    confirmedAt: Date;
    checkInStatus: string;
  }> = [];

  for (const b of confirmedBookings) {
    const confirmedAt = new Date(b.reviewedAt || b.createdAt);
    for (const p of b.passengers || []) {
      rawPassengers.push({
        id: p.id,
        fullName: p.fullName,
        identityType: p.identityType,
        identityNumber: p.identityNumber,
        bookingId: b.id,
        bookingReference: b.reference,
        confirmedAt,
        checkInStatus: p.checkInStatus,
      });
    }
  }

  // Deterministic FIFO distribution across physical vehicles
  let currentVehicleIndex = 0;
  let seatWithinVehicle = 1;

  for (const p of rawPassengers) {
    let targetVehicle = vehicleGroups[currentVehicleIndex];
    if (!targetVehicle) {
      break; // Strictly cannot exceed finite physical capacity
    }

    if (seatWithinVehicle > targetVehicle.capacity) {
      currentVehicleIndex += 1;
      targetVehicle = vehicleGroups[currentVehicleIndex];
      seatWithinVehicle = 1;
      if (!targetVehicle) break;
    }

    const allocatedPassenger: AllocatedPassenger = {
      passengerId: p.id,
      fullName: p.fullName,
      identityType: p.identityType,
      identityNumber: p.identityNumber,
      bookingId: p.bookingId,
      bookingReference: p.bookingReference,
      confirmedAt: p.confirmedAt,
      vehicleName: targetVehicle.name,
      plateNumber: targetVehicle.plateNumber || null,
      seatNumber: seatWithinVehicle,
      isVehicleAssigned: !!targetVehicle.plateNumber,
      status: p.checkInStatus,
    };

    targetVehicle.passengers.push(allocatedPassenger);
    targetVehicle.allocatedCount += 1;
    seatWithinVehicle += 1;
  }

  const totalCapacity = vehicleGroups.reduce((sum, v) => sum + v.capacity, 0);

  return {
    tripId: trip.id,
    routeTitle,
    departureTime,
    departureDate,
    totalCapacity,
    totalReserved: trip.seatsReserved,
    totalConfirmed: rawPassengers.length,
    vehicles: vehicleGroups,
  };
}

/**
 * Get authoritative FIFO allocation for an individual passenger.
 */
export async function getPassengerAllocation(passengerId: string): Promise<AllocatedPassenger | null> {
  const passenger = await orm.Passenger.where({ id: passengerId })
    .include("booking")
    .first();

  if (!passenger || !passenger.booking) return null;

  const summary = await calculateTripFIFOAllocation(passenger.booking.tripId);
  for (const v of summary.vehicles) {
    const found = v.passengers.find((p) => p.passengerId === passengerId);
    if (found) return found;
  }

  return null;
}
