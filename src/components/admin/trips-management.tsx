import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TripForm } from "@/components/trip-form";
import Link from "next/link";

interface TripItem {
  id: string;
  originLocationId: string;
  destinationLocationId: string;
  purposeId: string;
  vehicleId?: string | null;
  seatCapacity: number;
  seatsReserved: number;
  farePerSeat: number;
  departureAt: Date | string;
  arrivalAt?: Date | string | null;
  bookingDeadline?: Date | string | null;
  status: string;
  notes?: string | null;
  eventId?: string | null;
  originLocation?: { name: string } | null;
  destinationLocation?: { name: string } | null;
  purpose?: { name: string } | null;
  vehicle?: {
    name: string;
    plateNumber: string;
    seatCapacity: number;
  } | null;
}

interface TripsManagementProps {
  allTrips: TripItem[];
  locations: Array<{ id: string; name: string }>;
  purposes: Array<{ id: string; name: string }>;
  vehicles: Array<{ id: string; name: string; plateNumber: string; seatCapacity: number }>;
  events: Array<{ id: string; name: string }>;
  tripToEdit?: TripItem | null;
  isCreating?: boolean;
  initialFromLocationId?: string;
  initialToLocationId?: string;
  initialDepartureDate?: string;
}

export function TripsManagement({
  allTrips,
  locations,
  purposes,
  vehicles,
  events,
  tripToEdit,
  isCreating,
  initialFromLocationId,
  initialToLocationId,
  initialDepartureDate,
}: TripsManagementProps) {
  return (
    <div className="space-y-6">
      {/* Page Heading & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E3E8E5]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0A0A0A]">
            Trips & Departures Management
          </h1>
          <p className="text-xs text-[#66706A] mt-0.5">
            {allTrips.length} scheduled trips configured across the transportation network.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isCreating ? (
            <Button variant="neutral" size="sm" asChild>
              <Link href="/admin/trips">Close Form</Link>
            </Button>
          ) : (
            <Button size="sm" asChild>
              <Link href="/admin/trips?create=true" className="inline-flex items-center gap-1">
                <span>+</span>
                <span>Schedule New Trip</span>
              </Link>
            </Button>
          )}
          <Button variant="secondary" size="sm" asChild>
            <Link href="/admin/routes">Manage Routes</Link>
          </Button>
        </div>
      </div>

      {/* Trip Creation / Editing Form Panel */}
      {isCreating && (
        <div className="bg-white border-2 border-brand-green/30 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E3E8E5] pb-3">
            <div>
              <h2 className="text-base font-bold text-[#0A0A0A]">
                {tripToEdit ? "Edit Scheduled Trip" : "Schedule New Trip Departure"}
              </h2>
              <p className="text-xs text-[#66706A]">
                Select a purpose and any active origin and destination, then assign the vehicle and schedule.
              </p>
            </div>
            <Link
              href="/admin/trips"
              className="text-xs text-[#66706A] hover:text-[#0A0A0A] font-semibold"
            >
              ✕ Cancel
            </Link>
          </div>

          <TripForm
            locations={locations}
            purposes={purposes}
            vehicles={vehicles}
            events={events}
            initialFromLocationId={tripToEdit?.originLocationId ?? initialFromLocationId}
            initialToLocationId={tripToEdit?.destinationLocationId ?? initialToLocationId}
            initialDepartureDate={initialDepartureDate}
            tripToEdit={
              tripToEdit
                ? {
                    id: tripToEdit.id,
                    originLocationId: tripToEdit.originLocationId,
                    destinationLocationId: tripToEdit.destinationLocationId,
                    purposeId: tripToEdit.purposeId,
                    vehicleId: tripToEdit.vehicleId,
                    seatCapacity: tripToEdit.seatCapacity,
                    farePerSeat: tripToEdit.farePerSeat,
                    bookingDeadline: tripToEdit.bookingDeadline ? String(tripToEdit.bookingDeadline) : null,
                    departureAt: String(tripToEdit.departureAt),
                    arrivalAt: tripToEdit.arrivalAt ? String(tripToEdit.arrivalAt) : null,
                    status: tripToEdit.status,
                    eventId: tripToEdit.eventId,
                    notes: tripToEdit.notes,
                  }
                : undefined
            }
          />
        </div>
      )}

      {/* Trips Table */}
      <div className="bg-white border border-[#E3E8E5] rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAF9] border-b border-[#E3E8E5] text-[#66706A] font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Departure Time</th>
                <th className="px-4 py-3">Purpose</th>
                <th className="px-4 py-3">From → Destination</th>
                <th className="px-4 py-3">Assigned Vehicle</th>
                <th className="px-4 py-3">Occupancy</th>
                <th className="px-4 py-3">Fare</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E8E5]/70">
              {allTrips.map((trip) => {
                const dept = new Date(trip.departureAt);
                const isFull = trip.seatsReserved >= trip.seatCapacity;

                const statusBadge = (() => {
                  switch (trip.status) {
                    case "PUBLISHED":
                      return <Badge variant="success">Published</Badge>;
                    case "DRAFT":
                      return <Badge variant="neutral">Draft</Badge>;
                    case "CLOSED":
                      return <Badge variant="warning">Closed</Badge>;
                    case "DEPARTED":
                    case "COMPLETED":
                      return <Badge variant="neutral">{trip.status}</Badge>;
                    case "CANCELLED":
                      return <Badge variant="error">Cancelled</Badge>;
                    default:
                      return <Badge variant="neutral">{trip.status}</Badge>;
                  }
                })();

                return (
                  <tr key={trip.id} className="hover:bg-[#F8FAF9]/80 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-mono font-bold text-[#0A0A0A]">
                        {dept.toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </div>
                      <div className="text-[11px] text-[#66706A]">
                        {dept.toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-[#171717]">{trip.purpose?.name || "Trip purpose"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-[#171717] flex items-center gap-1.5">
                        <span>{trip.originLocation?.name || "Origin"}</span>
                        <span className="text-brand-green">→</span>
                        <span>{trip.destinationLocation?.name || "Destination"}</span>
                      </div>
                      {trip.notes && (
                        <div className="text-[11px] text-[#66706A] truncate max-w-xs mt-0.5">
                          {trip.notes}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-[#66706A]">
                      {trip.vehicle ? (
                        <span className="bg-[#F3F6F4] px-2 py-0.5 rounded text-[#171717] font-semibold border border-[#E3E8E5]">
                          {trip.vehicle.plateNumber} ({trip.vehicle.name})
                        </span>
                      ) : (
                        <span className="text-[#D97706] bg-[#FFFBEB] px-2 py-0.5 rounded text-[11px] font-semibold border border-[#FDE68A]">
                          Vehicle to be assigned
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono font-semibold text-[#0A0A0A]">
                        {trip.seatsReserved} / {trip.seatCapacity}
                      </div>
                      <div className="text-[11px] text-[#66706A]">
                        {isFull ? (
                          <span className="text-[#92400E] font-semibold">Full</span>
                        ) : (
                          `${trip.seatCapacity - trip.seatsReserved} left`
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-[#0A0A0A]">
                      ETB {trip.farePerSeat}
                    </td>
                    <td className="px-4 py-3">{statusBadge}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="neutral" size="sm" asChild>
                          <Link href={`/admin/trips?editId=${trip.id}`}>Edit</Link>
                        </Button>
                        <Button size="sm" asChild>
                          <Link href={`/staff/check-in/${trip.id}`}>Console</Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
