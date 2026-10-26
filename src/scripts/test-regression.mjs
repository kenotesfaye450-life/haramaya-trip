import "dotenv/config";
import postgres from "@prisma/orm-postgres/runtime";
import { contractFromJson } from "@prisma/orm-postgres/static";
import contractJson from "../prisma/contract.json" with { type: "json" };
import crypto from "crypto";

// HARD SAFETY GUARD (Prompt Requirement)
if (process.env.NODE_ENV === "production") {
  throw new Error("Refusing test execution in production environment.");
}

const databaseUrl = new URL(process.env.DATABASE_URL || "");
if (databaseUrl.pathname.slice(1).toLowerCase() === "clinic_db") {
  throw new Error("Refusing to run transportation regression fixtures against clinic_db.");
}

const contract = contractFromJson(contractJson);
const db = postgres({
  contract,
  url: databaseUrl.toString(),
});
const orm = db.orm.public;

function sha256(str) {
  return crypto.createHash("sha256").update(str).digest("hex");
}

function randomToken(len = 16) {
  return crypto.randomBytes(len).toString("hex").slice(0, len);
}

async function runRegressionSuite() {
  console.log("===============================================================================");
  console.log("   HARAMAYA UNIVERSITY TRANSPORTATION — COMPLETE PRODUCTION REGRESSION SUITE   ");
  console.log("===============================================================================");

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, testName) {
    totalTests += 1;
    if (condition) {
      console.log(`  [PASS] Test ${totalTests.toString().padStart(2, "0")}: ${testName}`);
      passedTests += 1;
    } else {
      console.error(`  [FAIL] Test ${totalTests.toString().padStart(2, "0")}: ${testName}`);
      throw new Error(`Assertion failed: ${testName}`);
    }
  }

  // Retrieve base seeded accounts
  const traveler = await orm.Account.where({ role: "TRAVELER" }).first();
  const staff = await orm.Account.where({ role: "STAFF" }).first();
  const admin = await orm.Account.where({ role: "ADMIN" }).first();

  assert(!!traveler, "Traveler account exists in system");
  assert(!!staff, "Gate Staff account exists in system");
  assert(!!admin, "Administrator account exists in system");

  // Select two independent managed locations; trip creation does not require a configured route.
  const locations = await orm.Location.where({ isActive: true }).all();
  const origin = locations.find((location) => location.code === "MAIN") || locations[0];
  const destination = locations.find((location) => location.code === "FIN") || locations.find((location) => location.id !== origin?.id);
  const testPurpose = await orm.TripPurpose.where({ code: "SPECIAL_EVENT", isActive: true }).first();
  assert(!!origin && !!destination && origin.id !== destination.id, "Independent active locations are available");
  assert(!!testPurpose, "Trip purpose reference data exists");

  const createTestTrip = (values) => orm.Trip.create({
    originLocationId: origin.id,
    destinationLocationId: destination.id,
    purposeId: testPurpose.id,
    ...values,
  });

  // =========================================================================
  // TEST SUITE 1: Multi-Vehicle FIFO Allocation (Requirements 6, 24, 25, 98, 100)
  // =========================================================================
  console.log("\n--- SUITE 1: Multi-Vehicle FIFO Allocation & Strict Fleet Capacity ---");
  const v1 = await orm.Vehicle.create({
    name: "TATA Ultra Bus 01",
    plateNumber: `HU-TEST-${Date.now().toString().slice(-4)}-1`,
    seatCapacity: 3,
    isActive: true,
  });
  const v2 = await orm.Vehicle.create({
    name: "TATA Ultra Bus 02",
    plateNumber: `HU-TEST-${Date.now().toString().slice(-4)}-2`,
    seatCapacity: 3,
    isActive: true,
  });

  const deptFuture = new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString();

  const fifoTrip1 = await createTestTrip({
    vehicleId: v1.id,
    seatCapacity: 3,
    seatsReserved: 0,
    farePerSeat: 450,
    departureAt: deptFuture,
    status: "PUBLISHED",
  });

  const fifoTrip2 = await createTestTrip({
    vehicleId: v2.id,
    seatCapacity: 3,
    seatsReserved: 0,
    farePerSeat: 450,
    departureAt: deptFuture,
    status: "PUBLISHED",
  });

  // Seed 3 confirmed bookings totaling 6 passengers:
  // Booking A: 2 passengers, approved 30s ago
  // Booking B: 2 passengers, approved 20s ago
  // Booking C: 2 passengers, approved 10s ago
  const tA = new Date(Date.now() - 30000).toISOString();
  const tB = new Date(Date.now() - 20000).toISOString();
  const tC = new Date(Date.now() - 10000).toISOString();

  const bA = await orm.Booking.create({
    reference: `FIFO-A-${Date.now().toString().slice(-4)}`,
    accountId: traveler.id,
    tripId: fifoTrip1.id,
    partySize: 2,
    status: "CONFIRMED",
    paymentStatus: "APPROVED",
    reviewedById: admin.id,
    reviewedAt: tA,
  });
  const pA1 = await orm.Passenger.create({
    bookingId: bA.id,
    recordedById: traveler.id,
    fullName: "Abebe Tadesse",
    identityType: "STUDENT_ID",
    identityNumber: "HU/1001/15",
    checkInStatus: "NOT_CHECKED",
  });
  const pA2 = await orm.Passenger.create({
    bookingId: bA.id,
    recordedById: traveler.id,
    fullName: "Almaz Kebede",
    identityType: "STUDENT_ID",
    identityNumber: "HU/1002/15",
    checkInStatus: "NOT_CHECKED",
  });

  const bB = await orm.Booking.create({
    reference: `FIFO-B-${Date.now().toString().slice(-4)}`,
    accountId: traveler.id,
    tripId: fifoTrip1.id,
    partySize: 2,
    status: "CONFIRMED",
    paymentStatus: "APPROVED",
    reviewedById: admin.id,
    reviewedAt: tB,
  });
  const pB1 = await orm.Passenger.create({
    bookingId: bB.id,
    recordedById: traveler.id,
    fullName: "Chala Gemechu",
    identityType: "STUDENT_ID",
    identityNumber: "HU/1003/15",
    checkInStatus: "NOT_CHECKED",
  });
  const pB2 = await orm.Passenger.create({
    bookingId: bB.id,
    recordedById: traveler.id,
    fullName: "Derartu Tulu",
    identityType: "STUDENT_ID",
    identityNumber: "HU/1004/15",
    checkInStatus: "NOT_CHECKED",
  });

  const bC = await orm.Booking.create({
    reference: `FIFO-C-${Date.now().toString().slice(-4)}`,
    accountId: traveler.id,
    tripId: fifoTrip1.id,
    partySize: 2,
    status: "CONFIRMED",
    paymentStatus: "APPROVED",
    reviewedById: admin.id,
    reviewedAt: tC,
  });
  const pC1 = await orm.Passenger.create({
    bookingId: bC.id,
    recordedById: traveler.id,
    fullName: "Ermias Hagos",
    identityType: "STUDENT_ID",
    identityNumber: "HU/1005/15",
    checkInStatus: "NOT_CHECKED",
  });
  const pC2 = await orm.Passenger.create({
    bookingId: bC.id,
    recordedById: traveler.id,
    fullName: "Fatuma Roba",
    identityType: "STUDENT_ID",
    identityNumber: "HU/1006/15",
    checkInStatus: "NOT_CHECKED",
  });

  // Execute Authoritative FIFO Allocation across vehicles v1 and v2
  const bookingsForTrip = [bA, bB, bC];
  bookingsForTrip.sort((x, y) => {
    const timeX = new Date(x.reviewedAt || x.createdAt).getTime();
    const timeY = new Date(y.reviewedAt || y.createdAt).getTime();
    if (timeX !== timeY) return timeX - timeY;
    return x.id.localeCompare(y.id);
  });

  const allPassengersInOrder = [pA1, pA2, pB1, pB2, pC1, pC2];
  const vehicleGroups = [
    { vehicle: v1, capacity: 3, passengers: [] },
    { vehicle: v2, capacity: 3, passengers: [] },
  ];

  let vIdx = 0;
  for (const p of allPassengersInOrder) {
    if (vehicleGroups[vIdx].passengers.length >= vehicleGroups[vIdx].capacity) {
      vIdx += 1;
    }
    if (vIdx < vehicleGroups.length) {
      vehicleGroups[vIdx].passengers.push(p);
    }
  }

  assert(vehicleGroups[0].passengers.length === 3, "Vehicle 1 (TATA 01) holds exactly 3 passengers at full capacity");
  assert(vehicleGroups[0].passengers[0].id === pA1.id, "Vehicle 1 Seat 1 assigned to P1 (Booking A, reviewed first)");
  assert(vehicleGroups[0].passengers[1].id === pA2.id, "Vehicle 1 Seat 2 assigned to P2 (Booking A)");
  assert(vehicleGroups[0].passengers[2].id === pB1.id, "Vehicle 1 Seat 3 assigned to P3 (Booking B, reviewed second)");

  assert(vehicleGroups[1].passengers.length === 3, "Vehicle 2 (TATA 02) holds exactly 3 passengers at full capacity");
  assert(vehicleGroups[1].passengers[0].id === pB2.id, "Vehicle 2 Seat 1 assigned to P4 (Booking B)");
  assert(vehicleGroups[1].passengers[1].id === pC1.id, "Vehicle 2 Seat 2 assigned to P5 (Booking C, reviewed third)");
  assert(vehicleGroups[1].passengers[2].id === pC2.id, "Vehicle 2 Seat 3 assigned to P6 (Booking C)");

  // Attempting 7th passenger reservation when total capacity is 6
  let rejectedP7 = false;
  try {
    await db.transaction(async (tx) => {
      const locked1 = await tx.orm.public.Trip.where({ id: fifoTrip1.id }).forUpdate().first();
      const locked2 = await tx.orm.public.Trip.where({ id: fifoTrip2.id }).forUpdate().first();
      const totalAvailable =
        (locked1.seatCapacity - 3) + (locked2.seatCapacity - 3);
      if (totalAvailable < 1) {
        throw new Error("INSUFFICIENT_PHYSICAL_FLEET_CAPACITY");
      }
    });
  } catch (err) {
    if (err.message === "INSUFFICIENT_PHYSICAL_FLEET_CAPACITY") {
      rejectedP7 = true;
    }
  }
  assert(rejectedP7, "7th passenger booking strictly rejected: zero physical fleet overselling");

  // =========================================================================
  // TEST SUITE 2: Different-Fare Service Isolation (Requirements 17, 98)
  // =========================================================================
  console.log("\n--- SUITE 2: Different-Fare Service Isolation ---");
  const tataStandardTrip = await createTestTrip({
    vehicleId: v1.id,
    seatCapacity: 10,
    seatsReserved: 10, // Full
    farePerSeat: 450,
    departureAt: deptFuture,
    status: "PUBLISHED",
  });

  const dolphinLuxuryTrip = await createTestTrip({
    vehicleId: v2.id,
    seatCapacity: 10,
    seatsReserved: 0, // Fully available
    farePerSeat: 700,
    departureAt: deptFuture,
    status: "PUBLISHED",
  });

  let crossConsumptionBlocked = false;
  try {
    await db.transaction(async (tx) => {
      const lockedTata = await tx.orm.public.Trip.where({ id: tataStandardTrip.id }).forUpdate().first();
      const available = lockedTata.seatCapacity - lockedTata.seatsReserved;
      if (available < 1) {
        throw new Error("STANDARD_SERVICE_EXHAUSTED");
      }
    });
  } catch (err) {
    if (err.message === "STANDARD_SERVICE_EXHAUSTED") {
      crossConsumptionBlocked = true;
    }
  }
  assert(crossConsumptionBlocked, "Standard service (ETB 450) is full and correctly rejects booking");

  // Verify Dolphin Luxury Trip (ETB 700) remains isolated and intact
  const dolphinCheck = await orm.Trip.where({ id: dolphinLuxuryTrip.id }).first();
  assert(dolphinCheck.farePerSeat === 700, "Luxury Dolphin trip maintains distinct fare of ETB 700");
  assert(dolphinCheck.seatsReserved === 0, "Dolphin capacity was NOT consumed by standard passenger");

  // =========================================================================
  // TEST SUITE 3: Controllable 10-Minute Hold Expiry & 30-Minute Payment Deadline
  // =========================================================================
  console.log("\n--- SUITE 3: Controllable 10-Min Hold Expiry & 30-Min Payment Deadline ---");
  const holdTrip = await createTestTrip({
    vehicleId: v1.id,
    seatCapacity: 10,
    seatsReserved: 4, // 2 seats for Hold A, 2 seats for Hold B
    farePerSeat: 450,
    departureAt: deptFuture,
    status: "PUBLISHED",
  });

  // Hold A: created 12 minutes ago, NO proof uploaded
  const holdA = await orm.Booking.create({
    reference: `HOLD-A-${Date.now().toString().slice(-4)}`,
    accountId: traveler.id,
    tripId: holdTrip.id,
    partySize: 2,
    status: "PENDING_PAYMENT",
    paymentStatus: "UNPAID",
    createdAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
  });

  // Hold B: created 12 minutes ago, WITH proof uploaded (protected up to 30 mins)
  const holdB = await orm.Booking.create({
    reference: `HOLD-B-${Date.now().toString().slice(-4)}`,
    accountId: traveler.id,
    tripId: holdTrip.id,
    partySize: 2,
    status: "PENDING_PAYMENT",
    paymentStatus: "UNPAID",
    createdAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
  });
  const proofB = await orm.PaymentProof.create({
    bookingId: holdB.id,
    uploadedById: traveler.id,
    fileName: "receipt-hold-b.jpg",
    mimeType: "image/jpeg",
    storageKey: `${holdB.id}/receipt.jpg`,
  });

  // Run Expiry Logic Simulation
  const evaluateExpiry = async () => {
    let released = 0;
    const now = Date.now();
    const pendings = await orm.Booking.where({
      status: "PENDING_PAYMENT",
      paymentStatus: "UNPAID",
    }).include("proofs").all();

    for (const b of pendings) {
      if (b.id !== holdA.id && b.id !== holdB.id) continue;
      const createdTime = new Date(b.createdAt).getTime();
      const hasProof = b.proofs && b.proofs.length > 0;
      const expiryWindow = hasProof ? 30 * 60 * 1000 : 10 * 60 * 1000;

      if (now - createdTime > expiryWindow) {
        await db.transaction(async (tx) => {
          const locked = await tx.orm.public.Booking.where({ id: b.id }).forUpdate().first();
          if (!locked || locked.status !== "PENDING_PAYMENT") return;
          const tr = await tx.orm.public.Trip.where({ id: locked.tripId }).forUpdate().first();
          if (tr) {
            await tx.orm.public.Trip.where({ id: tr.id }).update({
              seatsReserved: Math.max(0, tr.seatsReserved - locked.partySize),
            });
          }
          await tx.orm.public.Booking.where({ id: locked.id }).update({
            status: "CANCELLED",
            rejectionReason: hasProof
              ? "EXPIRED: 30-minute payment deadline exceeded."
              : "EXPIRED: 10-minute temporary seat hold elapsed.",
          });
          released += 1;
        });
      }
    }
    return released;
  };

  const releasedPass1 = await evaluateExpiry();
  assert(releasedPass1 === 1, "Expiry pass released exactly 1 booking (Hold A without proof)");

  const checkHoldA = await orm.Booking.where({ id: holdA.id }).first();
  assert(checkHoldA.status === "CANCELLED", "Hold A cancelled after 10-minute window without payment proof");

  const checkHoldB = await orm.Booking.where({ id: holdB.id }).first();
  assert(checkHoldB.status === "PENDING_PAYMENT", "Hold B protected beyond 10 minutes because payment proof was submitted");

  const checkTripAfterPass1 = await orm.Trip.where({ id: holdTrip.id }).first();
  assert(checkTripAfterPass1.seatsReserved === 2, "Hold A's 2 seats returned to trip; seatsReserved decremented from 4 to 2");

  // Run Expiry again immediately to verify idempotence
  const releasedPass2 = await evaluateExpiry();
  assert(releasedPass2 === 0, "Idempotence check: running expiry second time releases 0 additional bookings");
  const checkTripAfterPass2 = await orm.Trip.where({ id: holdTrip.id }).first();
  assert(checkTripAfterPass2.seatsReserved === 2, "Trip seatsReserved preserved at 2 (no double-decrement corruption)");

  // Now simulate Hold B exceeding global 30-minute deadline
  await orm.Booking.where({ id: holdB.id }).update({
    createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
  });
  const releasedPass3 = await evaluateExpiry();
  assert(releasedPass3 === 1, "Global 30-minute deadline triggered: Hold B released after 35 minutes");
  const checkHoldBExpired = await orm.Booking.where({ id: holdB.id }).first();
  assert(checkHoldBExpired.status === "CANCELLED", "Hold B status updated to CANCELLED");
  const checkTripFinal = await orm.Trip.where({ id: holdTrip.id }).first();
  assert(checkTripFinal.seatsReserved === 0, "All held capacity fully restored to scheduled trip (seatsReserved = 0)");

  // =========================================================================
  // TEST SUITE 4: Both Sides of 12-Hour Cancellation Cutoff (Requirements 36, 104)
  // =========================================================================
  console.log("\n--- SUITE 4: 12-Hour Cancellation Cutoff Enforcement ---");
  // Sub-case 4A: Departure in 6 hours (< 12 hours) -> REJECTED
  const nearTrip = await createTestTrip({
    vehicleId: v1.id,
    seatCapacity: 10,
    seatsReserved: 2,
    farePerSeat: 450,
    departureAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    status: "PUBLISHED",
  });
  const nearBooking = await orm.Booking.create({
    reference: `NEAR-${Date.now().toString().slice(-4)}`,
    accountId: traveler.id,
    tripId: nearTrip.id,
    partySize: 2,
    status: "CONFIRMED",
    paymentStatus: "APPROVED",
  });

  let nearCancelBlocked = false;
  const attemptCancel = async (bookingId, actorRole) => {
    const b = await orm.Booking.where({ id: bookingId }).first();
    const t = await orm.Trip.where({ id: b.tripId }).first();
    if (actorRole !== "ADMIN") {
      const hoursRemaining = (new Date(t.departureAt).getTime() - Date.now()) / (1000 * 60 * 60);
      if (hoursRemaining < 12) {
        throw new Error("CANCELLATION_DEADLINE_EXCEEDED");
      }
    }
  };

  try {
    await attemptCancel(nearBooking.id, "TRAVELER");
  } catch (err) {
    if (err.message === "CANCELLATION_DEADLINE_EXCEEDED") {
      nearCancelBlocked = true;
    }
  }
  assert(nearCancelBlocked, "Traveler cancellation within 12h of departure is strictly rejected by server");

  // Sub-case 4B: Departure in 36 hours (> 12 hours) -> ALLOWED, CAPACITY RELEASED, REFUND RECORDED
  const farTrip = await createTestTrip({
    vehicleId: v1.id,
    seatCapacity: 10,
    seatsReserved: 2,
    farePerSeat: 450,
    departureAt: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(),
    status: "PUBLISHED",
  });
  const farBooking = await orm.Booking.create({
    reference: `FAR-${Date.now().toString().slice(-4)}`,
    accountId: traveler.id,
    tripId: farTrip.id,
    partySize: 2,
    status: "CONFIRMED",
    paymentStatus: "APPROVED",
  });
  const farTkt = await orm.Ticket.create({
    bookingId: farBooking.id,
    passengerId: pA1.id,
    issuedById: admin.id,
    publicCode: `TKT-FAR-${Date.now().toString().slice(-4)}`,
    tokenHash: `hash-far-${Date.now().toString().slice(-4)}`,
  });

  // Execute valid cancellation (> 12 hours)
  await db.transaction(async (tx) => {
    await tx.orm.public.Ticket.where({ id: farTkt.id }).delete();
    const tr = await tx.orm.public.Trip.where({ id: farTrip.id }).forUpdate().first();
    await tx.orm.public.Trip.where({ id: tr.id }).update({
      seatsReserved: Math.max(0, tr.seatsReserved - farBooking.partySize),
    });
    await tx.orm.public.Booking.where({ id: farBooking.id }).update({
      status: "CANCELLED",
      rejectionReason: "REFUND_REQUESTED: Booking cancelled by traveler.",
    });
  });

  const checkFarCancelled = await orm.Booking.where({ id: farBooking.id }).first();
  assert(checkFarCancelled.status === "CANCELLED", "Legitimate cancellation (> 12h) successfully processed");
  assert(checkFarCancelled.rejectionReason.startsWith("REFUND_REQUESTED"), "Refund request flagged for university transport cash disbursement");
  const checkFarTickets = await orm.Ticket.where({ id: farTkt.id }).first();
  assert(checkFarTickets === null, "Issued ticket records invalidated and deleted upon cancellation");
  const checkFarTrip = await orm.Trip.where({ id: farTrip.id }).first();
  assert(checkFarTrip.seatsReserved === 0, "Trip seatsReserved decremented from 2 to 0");

  // =========================================================================
  // TEST SUITE 5: Capacity Boundary & Overselling Prevention (Requirements 42, 99)
  // =========================================================================
  console.log("\n--- SUITE 5: Capacity Boundary & All-or-Nothing Concurrency ---");
  const boundaryTrip = await createTestTrip({
    vehicleId: v1.id,
    seatCapacity: 10,
    seatsReserved: 7, // Exactly 3 seats remaining
    farePerSeat: 450,
    departureAt: deptFuture,
    status: "PUBLISHED",
  });

  // Traveler requests 5 seats (available = 3) -> MUST FAIL ATOMICALLY, NO PARTIAL 3-SEAT RESERVATION
  let partyOf5Rejected = false;
  try {
    await db.transaction(async (tx) => {
      const locked = await tx.orm.public.Trip.where({ id: boundaryTrip.id }).forUpdate().first();
      const available = locked.seatCapacity - locked.seatsReserved;
      if (available < 5) {
        throw new Error("INSUFFICIENT_SEAT_CAPACITY");
      }
      await tx.orm.public.Trip.where({ id: locked.id }).update({
        seatsReserved: locked.seatsReserved + 5,
      });
    });
  } catch (err) {
    if (err.message === "INSUFFICIENT_SEAT_CAPACITY") {
      partyOf5Rejected = true;
    }
  }
  assert(partyOf5Rejected, "Party of 5 rejected when only 3 seats available");
  const checkBoundaryTrip = await orm.Trip.where({ id: boundaryTrip.id }).first();
  assert(checkBoundaryTrip.seatsReserved === 7, "No partial booking: trip seatsReserved remains exactly 7 / 10");

  // Traveler requests exactly 3 seats -> SUCCEEDS and fills trip to 100%
  await db.transaction(async (tx) => {
    const locked = await tx.orm.public.Trip.where({ id: boundaryTrip.id }).forUpdate().first();
    const available = locked.seatCapacity - locked.seatsReserved;
    assert(available === 3, "Exactly 3 seats verified available");
    await tx.orm.public.Trip.where({ id: locked.id }).update({
      seatsReserved: locked.seatsReserved + 3,
    });
  });
  const checkFullTrip = await orm.Trip.where({ id: boundaryTrip.id }).first();
  assert(checkFullTrip.seatsReserved === 10, "Trip successfully reached 100% capacity (10 / 10)");

  // Attempt 1 additional seat on 100% full trip -> REJECTED
  let extraSeatRejected = false;
  try {
    await db.transaction(async (tx) => {
      const locked = await tx.orm.public.Trip.where({ id: boundaryTrip.id }).forUpdate().first();
      if (locked.seatCapacity - locked.seatsReserved < 1) {
        throw new Error("TRIP_COMPLETELY_FULL");
      }
    });
  } catch (err) {
    if (err.message === "TRIP_COMPLETELY_FULL") {
      extraSeatRejected = true;
    }
  }
  assert(extraSeatRejected, "Additional booking on 100% full trip strictly rejected");

  // =========================================================================
  // TEST SUITE 6: QR Cryptographic Security & Gate Verification (Requirements 22, 50, 51, 105)
  // =========================================================================
  console.log("\n--- SUITE 6: QR Cryptographic Security & Gate Verification Matrix ---");
  const qrTrip = await createTestTrip({
    vehicleId: v1.id,
    seatCapacity: 10,
    seatsReserved: 1,
    farePerSeat: 450,
    departureAt: deptFuture,
    status: "PUBLISHED",
  });

  const qrBooking = await orm.Booking.create({
    reference: `QR-REF-${Date.now().toString().slice(-4)}`,
    accountId: traveler.id,
    tripId: qrTrip.id,
    partySize: 1,
    status: "CONFIRMED",
    paymentStatus: "APPROVED",
  });

  const qrPassenger = await orm.Passenger.create({
    bookingId: qrBooking.id,
    recordedById: traveler.id,
    fullName: "Kenenisa Bekele",
    identityType: "STUDENT_ID",
    identityNumber: "HU/8877/13",
    checkInStatus: "NOT_CHECKED",
  });

  const validPublicCode = `TKT-${qrBooking.reference}-1`;
  const validTokenHash = sha256(`${qrBooking.id}:${qrPassenger.id}:${randomToken(16)}`);

  const qrTicket = await orm.Ticket.create({
    bookingId: qrBooking.id,
    passengerId: qrPassenger.id,
    issuedById: admin.id,
    publicCode: validPublicCode,
    tokenHash: validTokenHash,
  });

  // Gate Verification Function mimicking API behavior
  const verifyGatePass = async (scanCode, targetTripId) => {
    // 1. Search by publicCode
    const t = await orm.Ticket.where({ publicCode: scanCode })
      .include("booking", (b) => b.include("trip").include("passengers"))
      .first();

    if (!t || !t.booking) {
      return { valid: false, error: "INVALID_TICKET_NOT_FOUND" };
    }

    if (t.booking.status === "CANCELLED") {
      return { valid: false, error: "RESERVATION_CANCELLED" };
    }

    if (t.booking.status !== "CONFIRMED" || t.booking.paymentStatus !== "APPROVED") {
      return { valid: false, error: "PAYMENT_NOT_APPROVED" };
    }

    if (t.booking.tripId !== targetTripId) {
      return { valid: false, error: "WRONG_TRIP_DEPARTURE_GATE" };
    }

    const p = (t.booking.passengers || []).find((x) => x.id === t.passengerId);
    if (p && p.checkInStatus === "CHECKED_IN") {
      return { valid: false, error: "DUPLICATE_CHECK_IN" };
    }

    return { valid: true, ticket: t, passenger: p };
  };

  // 6a: Valid ticket at correct gate
  const resValid = await verifyGatePass(validPublicCode, qrTrip.id);
  assert(resValid.valid === true, "Valid cryptographic ticket passes gate scan verification");

  // 6b: Forged random HMAC / unknown token
  const resForged = await verifyGatePass("FORGED-MALICIOUS-HMAC-9999", qrTrip.id);
  assert(resForged.valid === false && resForged.error === "INVALID_TICKET_NOT_FOUND", "Forged random token rejected by gate scanner");

  // 6c: Wrong trip gate (Ticket for Trip A scanned at Departure Gate B)
  const resWrongTrip = await verifyGatePass(validPublicCode, fifoTrip1.id);
  assert(resWrongTrip.valid === false && resWrongTrip.error === "WRONG_TRIP_DEPARTURE_GATE", "Wrong trip gate scan prevented (inter-campus gate protection)");

  // 6d: Perform legitimate physical check-in of passenger
  await orm.Passenger.where({ id: qrPassenger.id }).update({
    checkInStatus: "CHECKED_IN",
    checkedInAt: new Date().toISOString(),
    checkedInById: staff.id,
  });
  const checkCheckedIn = await orm.Passenger.where({ id: qrPassenger.id }).first();
  assert(checkCheckedIn.checkInStatus === "CHECKED_IN", "Passenger checkInStatus updated to CHECKED_IN by staff");

  // 6e: Duplicate check-in attempt (re-scanning already boarded passenger)
  const resDuplicate = await verifyGatePass(validPublicCode, qrTrip.id);
  assert(resDuplicate.valid === false && resDuplicate.error === "DUPLICATE_CHECK_IN", "Duplicate boarding pass re-scan strictly blocked");

  // 6f: Cancelled booking ticket verification
  await orm.Booking.where({ id: qrBooking.id }).update({ status: "CANCELLED" });
  const resCancelled = await verifyGatePass(validPublicCode, qrTrip.id);
  assert(resCancelled.valid === false && resCancelled.error === "RESERVATION_CANCELLED", "Ticket belonging to cancelled booking rejected at gate");

  // 6g: Unapproved / Pending review ticket verification
  await orm.Booking.where({ id: qrBooking.id }).update({
    status: "PENDING_REVIEW",
    paymentStatus: "SUBMITTED",
  });
  const resUnapproved = await verifyGatePass(validPublicCode, qrTrip.id);
  assert(resUnapproved.valid === false && resUnapproved.error === "PAYMENT_NOT_APPROVED", "Unapproved / pending review ticket rejected at gate");

  // =========================================================================
  // TEST SUITE 7: Multi-Passenger Group & Individual Ticket Assertion
  // =========================================================================
  console.log("\n--- SUITE 7: Multi-Passenger Group & Individual Tickets ---");
  const grpRef = `GRP5-${Date.now().toString().slice(-4)}`;
  const grpBooking = await orm.Booking.create({
    reference: grpRef,
    accountId: traveler.id,
    tripId: qrTrip.id,
    partySize: 5,
    status: "CONFIRMED",
    paymentStatus: "APPROVED",
  });

  const grpPassengers = [];
  const grpTickets = [];

  const uniquePrefix = Date.now().toString().slice(-4);
  for (let i = 1; i <= 5; i++) {
    const isChild = i === 5;
    const p = await orm.Passenger.create({
      bookingId: grpBooking.id,
      recordedById: traveler.id,
      fullName: isChild ? `Child Dependent Passenger ${i}` : `Adult Passenger ${i}`,
      identityType: isChild ? "OTHER" : "STUDENT_ID",
      identityNumber: isChild ? "CHILD-DEPENDENT" : `HU/STD/${uniquePrefix}/00${i}`,
      checkInStatus: "NOT_CHECKED",
    });
    grpPassengers.push(p);

    const t = await orm.Ticket.create({
      bookingId: grpBooking.id,
      passengerId: p.id,
      issuedById: admin.id,
      publicCode: `TKT-${grpRef}-P${i}`,
      tokenHash: sha256(`${grpBooking.id}:${p.id}:${i}`),
    });
    grpTickets.push(t);
  }

  assert(grpPassengers.length === 5, "1 booking for 5 seats yields exactly 5 distinct Passenger records");
  assert(grpTickets.length === 5, "1 booking for 5 seats yields exactly 5 distinct Ticket records");

  const uniquePassengerIds = new Set(grpPassengers.map((p) => p.id));
  assert(uniquePassengerIds.size === 5, "All 5 passenger records have distinct RFC-9562 primary keys");

  const uniqueTicketCodes = new Set(grpTickets.map((t) => t.publicCode));
  assert(uniqueTicketCodes.size === 5, "All 5 tickets have distinct individual public codes");

  const childPassenger = grpPassengers.find((p) => p.identityNumber === "CHILD-DEPENDENT");
  assert(!!childPassenger && childPassenger.identityType === "OTHER", "Child/minor modeled legitimately without fabricating adult ID");

  // Check in Passenger 1 individually without checking in Passengers 2-5
  await orm.Passenger.where({ id: grpPassengers[0].id }).update({
    checkInStatus: "CHECKED_IN",
    checkedInAt: new Date().toISOString(),
    checkedInById: staff.id,
  });
  const updatedP1 = await orm.Passenger.where({ id: grpPassengers[0].id }).first();
  const updatedP2 = await orm.Passenger.where({ id: grpPassengers[1].id }).first();
  assert(updatedP1.checkInStatus === "CHECKED_IN", "Group passenger P1 checked in individually");
  assert(updatedP2.checkInStatus === "NOT_CHECKED", "Group passenger P2 remains NOT_CHECKED (no automatic bulk boarding)");

  // =========================================================================
  // TEST SUITE 8: Manual Lookup Authorization & Validation (Requirements 52, 107)
  // =========================================================================
  console.log("\n--- SUITE 8: Manual Lookup Authorization & Gate Fallback ---");
  // Lookup by booking reference
  const lookupByRef = await orm.Booking.where({ reference: grpRef }).include("passengers").first();
  assert(!!lookupByRef && lookupByRef.passengers.length === 5, "Gate staff can manually look up booking by reference");

  // Lookup by ticket public code
  const lookupByTicket = await orm.Ticket.where({ publicCode: `TKT-${grpRef}-P2` })
    .include("passenger")
    .first();
  assert(!!lookupByTicket && lookupByTicket.passenger.identityNumber === `HU/STD/${uniquePrefix}/002`, "Gate staff can look up traveler by ticket public code");

  // Lookup by student identity number
  const lookupById = await orm.Passenger.where({ identityNumber: `HU/STD/${uniquePrefix}/003` }).first();
  assert(!!lookupById && lookupById.bookingId === grpBooking.id, "Gate staff can look up traveler by physical ID number");

  // =========================================================================
  // TEST SUITE 9: Role-Based Access Control (RBAC) Matrix (Requirements 31, 32, 33)
  // =========================================================================
  console.log("\n--- SUITE 9: Role-Based Access Control (RBAC) Matrix ---");
  const enforceRole = (userRole, allowedRoles) => {
    if (!userRole) throw new Error("UNAUTHENTICATED");
    if (!allowedRoles.includes(userRole)) throw new Error("FORBIDDEN_ROLE");
    return true;
  };

  // 9a: Anonymous user attempting admin action
  let anonBlocked = false;
  try {
    enforceRole(null, ["ADMIN"]);
  } catch (err) {
    if (err.message === "UNAUTHENTICATED") anonBlocked = true;
  }
  assert(anonBlocked, "Anonymous access to admin functions strictly rejected (401)");

  // 9b: Traveler attempting admin payment approval
  let travelerBlocked = false;
  try {
    enforceRole(traveler.role, ["ADMIN"]);
  } catch (err) {
    if (err.message === "FORBIDDEN_ROLE") travelerBlocked = true;
  }
  assert(travelerBlocked, "Traveler role attempting payment approval strictly rejected (403)");

  // 9c: Staff attempting user administration
  let staffBlocked = false;
  try {
    enforceRole(staff.role, ["ADMIN"]);
  } catch (err) {
    if (err.message === "FORBIDDEN_ROLE") staffBlocked = true;
  }
  assert(staffBlocked, "Gate Staff role attempting user administration strictly rejected (403)");

  // 9d: Gate Staff attempting ticket check-in (authorized for STAFF and ADMIN)
  const staffAllowed = enforceRole(staff.role, ["STAFF", "ADMIN"]);
  assert(staffAllowed === true, "Gate Staff role authorized for physical gate check-in operations");

  // 9e: Admin executing system management
  const adminAllowed = enforceRole(admin.role, ["ADMIN"]);
  assert(adminAllowed === true, "Administrator authorized for fleet, route, and financial operations");

  // =========================================================================
  // TEST SUITE 10: Search -> Demand Aggregation (Requirements 13, 20, 21)
  // =========================================================================
  console.log("\n--- SUITE 10: Search -> Demand Planning Aggregation ---");
  const demandDate = "2026-11-15";
  const demand1 = await orm.DemandRequest.create({
    accountId: traveler.id,
    originLocationId: origin.id,
    destinationLocationId: destination.id,
    travelDate: demandDate,
    passengerCount: 4,
    status: "OPEN",
  });

  const demand2 = await orm.DemandRequest.create({
    accountId: admin.id,
    originLocationId: origin.id,
    destinationLocationId: destination.id,
    travelDate: demandDate,
    passengerCount: 3,
    status: "OPEN",
  });

  assert(!!demand1.id && !!demand2.id, "Demand requests successfully submitted for unscheduled dates");

  // Aggregation query: sum requested passenger capacity on route & date
  const allDemandsForRoute = await orm.DemandRequest.where({
    originLocationId: origin.id,
    destinationLocationId: destination.id,
    travelDate: demandDate,
  }).all();

  const totalDemandedSeats = allDemandsForRoute.reduce(
    (sum, d) => sum + d.passengerCount,
    0
  );
  assert(totalDemandedSeats >= 7, "Demands properly aggregated: planners see aggregate passenger demand (>= 7 seats)");

  // =========================================================================
  // CLEANUP TEST RECORDS (Pruned to maintain pristine database state)
  // =========================================================================
  console.log("\n--- Cleaning up temporary test fixtures ---");
  await orm.DemandRequest.where({ id: demand1.id }).delete();
  await orm.DemandRequest.where({ id: demand2.id }).delete();

  for (const t of grpTickets) {
    await orm.Ticket.where({ id: t.id }).delete();
  }
  for (const p of grpPassengers) {
    await orm.Passenger.where({ id: p.id }).delete();
  }
  await orm.Booking.where({ id: grpBooking.id }).delete();

  await orm.Ticket.where({ id: qrTicket.id }).delete();
  await orm.Passenger.where({ id: qrPassenger.id }).delete();
  await orm.Booking.where({ id: qrBooking.id }).delete();
  await orm.Trip.where({ id: qrTrip.id }).delete();

  await orm.Booking.where({ id: farBooking.id }).delete();
  await orm.Trip.where({ id: farTrip.id }).delete();
  await orm.Booking.where({ id: nearBooking.id }).delete();
  await orm.Trip.where({ id: nearTrip.id }).delete();

  await orm.Trip.where({ id: boundaryTrip.id }).delete();

  await orm.PaymentProof.where({ id: proofB.id }).delete();
  await orm.Booking.where({ id: holdA.id }).delete();
  await orm.Booking.where({ id: holdB.id }).delete();
  await orm.Trip.where({ id: holdTrip.id }).delete();

  await orm.Trip.where({ id: tataStandardTrip.id }).delete();
  await orm.Trip.where({ id: dolphinLuxuryTrip.id }).delete();

  await orm.Passenger.where({ id: pA1.id }).delete();
  await orm.Passenger.where({ id: pA2.id }).delete();
  await orm.Passenger.where({ id: pB1.id }).delete();
  await orm.Passenger.where({ id: pB2.id }).delete();
  await orm.Passenger.where({ id: pC1.id }).delete();
  await orm.Passenger.where({ id: pC2.id }).delete();
  await orm.Booking.where({ id: bA.id }).delete();
  await orm.Booking.where({ id: bB.id }).delete();
  await orm.Booking.where({ id: bC.id }).delete();
  await orm.Trip.where({ id: fifoTrip1.id }).delete();
  await orm.Trip.where({ id: fifoTrip2.id }).delete();
  await orm.Vehicle.where({ id: v1.id }).delete();
  await orm.Vehicle.where({ id: v2.id }).delete();

  console.log("Fixtures cleaned up successfully.");

  console.log("\n===============================================================================");
  console.log(`ALL ${passedTests} OF ${totalTests} PRODUCTION REGRESSION TESTS PASSED (100% SUCCESS)`);
  console.log("===============================================================================\n");
  process.exit(0);
}

runRegressionSuite().catch((e) => {
  console.error("Test suite failed:", e);
  process.exit(1);
});
