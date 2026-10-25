import { orm } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface BookingRecord {
  id: string;
  reference: string;
  partySize: number;
  status: string;
  paymentStatus: string;
  createdAt: Date | string;
  account?: { fullName?: string | null; email?: string | null } | null;
  passengers?: Array<{ id: string; fullName: string; identityNumber: string }>;
  trip?: {
    id: string;
    departureAt: Date | string;
    farePerSeat: number;
    seatCapacity: number;
    seatsReserved: number;
    vehicle?: { name: string; plateNumber: string } | null;
    route?: {
      name?: string | null;
      originCampus?: { name: string } | null;
      destination?: { name: string } | null;
    } | null;
  } | null;
}

export async function BookingsList() {
  const bookings = (await orm.Booking.include("account")
    .include("trip", (t) =>
      t
        .include("route", (r) =>
          r.include("originCampus").include("destination")
        )
        .include("vehicle")
    )
    .include("passengers")
    .orderBy((b) => b.createdAt.desc())
    .limit(200)
    .all()) as BookingRecord[];

  // Group Bookings: Route -> Trip (Departure Date/Time) -> Bookings
  // This satisfies Requirements 14 & 15.
  type TripGroup = {
    tripId: string;
    departureAt: Date;
    departureTimeStr: string;
    departureDateStr: string;
    vehicleStr: string;
    occupancyStr: string;
    farePerSeat: number;
    bookings: BookingRecord[];
  };

  type RouteGroup = {
    routeName: string;
    originName: string;
    destName: string;
    trips: Map<string, TripGroup>;
    totalBookingsCount: number;
  };

  const routeGroups = new Map<string, RouteGroup>();

  for (const b of bookings) {
    const trip = b.trip;
    const originName = trip?.route?.originCampus?.name || "Unassigned Origin";
    const destName = trip?.route?.destination?.name || "Unassigned Destination";
    const routeKey = `${originName} → ${destName}`;

    if (!routeGroups.has(routeKey)) {
      routeGroups.set(routeKey, {
        routeName: routeKey,
        originName,
        destName,
        trips: new Map(),
        totalBookingsCount: 0,
      });
    }

    const routeGroup = routeGroups.get(routeKey)!;
    routeGroup.totalBookingsCount += 1;

    const tripId = trip?.id || "no-trip";
    if (!routeGroup.trips.has(tripId)) {
      const departureDate = trip ? new Date(trip.departureAt) : new Date(0);
      routeGroup.trips.set(tripId, {
        tripId,
        departureAt: departureDate,
        departureTimeStr: trip
          ? departureDate.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })
          : "TBA",
        departureDateStr: trip
          ? departureDate.toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })
          : "TBA",
        vehicleStr: trip?.vehicle
          ? `${trip.vehicle.name} (${trip.vehicle.plateNumber})`
          : "Vehicle to be assigned",
        occupancyStr: trip ? `${trip.seatsReserved} / ${trip.seatCapacity}` : "0 / 0",
        farePerSeat: trip?.farePerSeat || 0,
        bookings: [],
      });
    }

    routeGroup.trips.get(tripId)!.bookings.push(b);
  }

  // Sort routes alphabetically by origin then destination
  const sortedRoutes = Array.from(routeGroups.values()).sort((a, b) =>
    a.routeName.localeCompare(b.routeName)
  );

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E3E8E5]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0A0A0A]">
            Bookings & Reservations Roster
          </h1>
          <p className="text-xs text-[#66706A] mt-0.5">
            Organized operationally by Route → Scheduled Trip Departure → Individual Passenger Bookings.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/payments"
            className="text-xs font-semibold px-3 py-2 rounded-lg bg-brand-green text-white hover:bg-[#066044] transition-colors shadow-xs"
          >
            Review Pending Payments →
          </Link>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="bg-white border border-[#E3E8E5] rounded-xl p-12 text-center text-xs text-[#66706A] shadow-xs">
          No bookings recorded in the system yet.
        </div>
      ) : (
        <div className="space-y-8">
          {sortedRoutes.map((routeGroup) => {
            // Sort trips inside route by departure date/time ascending
            const sortedTrips = Array.from(routeGroup.trips.values()).sort(
              (a, b) => a.departureAt.getTime() - b.departureAt.getTime()
            );

            return (
              <section key={routeGroup.routeName} className="space-y-4">
                {/* Route Header Banner */}
                <div className="flex items-center justify-between bg-white border border-[#E3E8E5] rounded-xl px-5 py-3.5 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-brand-green" />
                    <h2 className="text-base font-bold text-[#0A0A0A] tracking-tight">
                      {routeGroup.originName}{" "}
                      <span className="text-brand-green font-normal mx-1">──→</span>{" "}
                      {routeGroup.destName}
                    </h2>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[#66706A]">
                    <span className="font-semibold text-[#0A0A0A] bg-[#F3F6F4] px-2.5 py-0.5 rounded-md border border-[#E3E8E5]">
                      {routeGroup.totalBookingsCount}{" "}
                      {routeGroup.totalBookingsCount === 1 ? "booking" : "bookings"}
                    </span>
                  </div>
                </div>

                {/* Scheduled Departures Under This Route */}
                <div className="space-y-4 pl-0 md:pl-4">
                  {sortedTrips.map((tripGroup) => (
                    <div
                      key={tripGroup.tripId}
                      className="bg-white border border-[#E3E8E5] rounded-xl overflow-hidden shadow-xs"
                    >
                      {/* Trip Departure Ribbon */}
                      <div className="bg-[#F8FAF9] border-b border-[#E3E8E5] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-[#0A0A0A] text-sm">
                            {tripGroup.departureTimeStr}
                          </span>
                          <span className="text-[#66706A] font-semibold">
                            {tripGroup.departureDateStr}
                          </span>
                          <span className="text-[#87918B]">·</span>
                          <span className="text-[#171717] font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-[#E3E8E5]">
                            {tripGroup.vehicleStr}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[#66706A]">
                            Occupancy:{" "}
                            <strong className="text-[#0A0A0A] font-mono">
                              {tripGroup.occupancyStr}
                            </strong>
                          </span>
                          <span className="text-[#87918B]">·</span>
                          <span className="text-brand-green font-bold font-mono">
                            ETB {tripGroup.farePerSeat}
                          </span>
                          {tripGroup.tripId !== "no-trip" && (
                            <Link
                              href={`/staff/check-in/${tripGroup.tripId}`}
                              className="text-[11px] font-semibold text-brand-green hover:underline ml-1"
                            >
                              Open Departure Console →
                            </Link>
                          )}
                        </div>
                      </div>

                      {/* Bookings Table for this Trip */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="border-b border-[#E3E8E5] text-[#66706A] text-[11px] uppercase tracking-wider font-semibold">
                            <tr>
                              <th className="px-4 py-2.5">Reference</th>
                              <th className="px-4 py-2.5">Booked By</th>
                              <th className="px-4 py-2.5">Passengers</th>
                              <th className="px-4 py-2.5">Seats</th>
                              <th className="px-4 py-2.5">Payment</th>
                              <th className="px-4 py-2.5">Status</th>
                              <th className="px-4 py-2.5 text-right">Booked Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E3E8E5]/70">
                            {tripGroup.bookings.map((b) => {
                              const created = new Date(b.createdAt);
                              const passengerNames = (b.passengers || [])
                                .map((p) => p.fullName)
                                .join(", ");

                              return (
                                <tr
                                  key={b.id}
                                  className="hover:bg-[#F8FAF9]/80 transition-colors"
                                >
                                  <td className="px-4 py-2.5 font-mono font-bold text-[#0A0A0A]">
                                    {b.reference}
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <div className="font-semibold text-[#171717]">
                                      {b.account?.fullName || "Traveler"}
                                    </div>
                                    <div className="text-[11px] text-[#66706A] font-mono">
                                      {b.account?.email || ""}
                                    </div>
                                  </td>
                                  <td className="px-4 py-2.5 text-xs text-[#374151] max-w-xs truncate">
                                    {passengerNames || "—"}
                                  </td>
                                  <td className="px-4 py-2.5 font-mono text-[#374151]">
                                    {b.partySize} {b.partySize === 1 ? "seat" : "seats"}
                                  </td>
                                  <td className="px-4 py-2.5">
                                    {b.paymentStatus === "APPROVED" && (
                                      <Badge variant="success">Approved</Badge>
                                    )}
                                    {b.paymentStatus === "SUBMITTED" && (
                                      <Badge variant="pending">Submitted</Badge>
                                    )}
                                    {b.paymentStatus === "UNPAID" && (
                                      <Badge variant="warning">Unpaid</Badge>
                                    )}
                                    {b.paymentStatus === "REJECTED" && (
                                      <Badge variant="error">Rejected</Badge>
                                    )}
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <Badge
                                      variant={
                                        b.status === "CONFIRMED"
                                          ? "success"
                                          : b.status === "PENDING_REVIEW"
                                          ? "pending"
                                          : b.status === "REJECTED"
                                          ? "error"
                                          : "neutral"
                                      }
                                    >
                                      {b.status}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-2.5 text-right font-mono text-[#66706A] text-[11px]">
                                    {created.toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                    })}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}