import { orm } from "@/lib/db";
import { releaseExpiredBookings } from "@/lib/booking-expiry";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface TripResultsProps {
  from?: string;
  to?: string;
  date?: string;
  passengers: number;
  isAuthenticated?: boolean;
}

export async function TripResults({
  from,
  to,
  date,
  passengers,
  isAuthenticated = true,
}: TripResultsProps) {
  // Release stale unpaid holds
  await releaseExpiredBookings();

  const trips = await orm.Trip.where({ status: "PUBLISHED" })
    .include("originLocation")
    .include("destinationLocation")
    .include("purpose")
    .include("vehicle")
    .orderBy((t) => t.departureAt.asc())
    .all();

  const filteredTrips = date
    ? trips.filter((trip) => {
        const searchDate = new Date(date);
        const startOfDay = new Date(searchDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(searchDate);
        endOfDay.setHours(23, 59, 59, 999);
        const tripDate = new Date(trip.departureAt);
        return tripDate >= startOfDay && tripDate <= endOfDay;
      })
    : trips;

  const returnSearch = new URLSearchParams();
  if (from) returnSearch.set("from", from);
  if (to) returnSearch.set("to", to);
  if (date) returnSearch.set("date", date);
  if (passengers > 1) returnSearch.set("passengers", String(passengers));
  const homeSearchHref = returnSearch.size
    ? "/?" + returnSearch.toString()
    : "/";
  const matchingTrips = filteredTrips.filter((trip) => {
    if (from) {
      const matchFromId = trip.originLocation?.id === from;
      const matchFromCode = trip.originLocation?.code?.toLowerCase() === from.toLowerCase();
      if (!matchFromId && !matchFromCode) return false;
    }

    if (to) {
      const matchToId = trip.destinationLocation?.id === to;
      const matchToCode = trip.destinationLocation?.code?.toLowerCase() === to.toLowerCase();
      if (!matchToId && !matchToCode) return false;
    }

    return true;
  });

  // Resolve labels for search header
  const firstTrip = matchingTrips[0];
  let fromLabel = firstTrip?.originLocation?.name;
  let toLabel = firstTrip?.destinationLocation?.name;

  if (!fromLabel && from) {
    const originEntity =
      (await orm.Location.where({ id: from }).first()) ||
      (await orm.Location.where({ code: from }).first());
    fromLabel = originEntity?.name || "Selected Location";
  } else if (!fromLabel) {
    fromLabel = "All Locations";
  }

  if (!toLabel && to) {
    const destEntity =
      (await orm.Location.where({ id: to }).first()) ||
      (await orm.Location.where({ code: to }).first());
    toLabel = destEntity?.name || "Selected Destination";
  } else if (!toLabel) {
    toLabel = "All Destinations";
  }

  return (
    <div className="space-y-6">
      {/* Search Criteria Bar */}
      <div className="bg-white border border-[#E3E8E5] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs">
        <div>
          <div className="text-[11px] font-bold text-brand-green uppercase tracking-wider">
            Available Departures
          </div>
          <div className="text-xl font-extrabold text-[#0A0A0A] tracking-tight mt-0.5 flex items-center gap-2">
            <span>{fromLabel}</span>
            <span className="text-brand-green">──→</span>
            <span>{toLabel}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#66706A] mt-1 font-medium">
            {date && (
              <>
                <span>
                  {new Date(date).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <span>·</span>
              </>
            )}
            <span>
              {passengers} {passengers === 1 ? "seat" : "seats"} requested
            </span>
            <span>·</span>
            <span className="text-brand-green font-bold">
              {matchingTrips.length} {matchingTrips.length === 1 ? "departure found" : "departures found"}
            </span>
          </div>
        </div>

        <Button variant="secondary" size="sm" asChild>
          <Link href={homeSearchHref}>Modify Search</Link>
        </Button>
      </div>

      {/* No Results State (Requirement 53) */}
      {matchingTrips.length === 0 ? (
        <div className="bg-white border border-[#E3E8E5] rounded-xl p-10 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl flex items-center justify-center text-brand-green mx-auto">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#0A0A0A]">
              No transport available
            </h3>
            <p className="text-xs text-[#66706A] max-w-md mx-auto mt-1.5 leading-relaxed">
              There is currently no published departure matching {fromLabel} → {toLabel}
              {date ? ` for ${new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button variant="secondary" size="sm" asChild>
              <Link href={homeSearchHref}>Change Date or Route</Link>
            </Button>
            <Button size="sm" asChild>
              <Link
                href={`/demand?from=${encodeURIComponent(from || "")}&to=${encodeURIComponent(
                  to || ""
                )}&date=${encodeURIComponent(date || "")}&passengers=${passengers}`}
              >
                Request this trip →
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        /* Results List */
        <div className="bg-white border border-[#E3E8E5] rounded-xl divide-y divide-[#E3E8E5] shadow-xs overflow-hidden">
          {matchingTrips.map((trip) => {
            const availableSeats = trip.seatCapacity - trip.seatsReserved;
            const isFewSeats = availableSeats > 0 && availableSeats <= 8;
            const hasEnoughSeats = availableSeats >= passengers;
            const departureDate = new Date(trip.departureAt);
            const timeStr = departureDate.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            });
            const dateStr = departureDate.toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            });

            const originName = trip.originLocation?.name || "Origin";
            const destName = trip.destinationLocation?.name || "Destination";
            const bookingUrl = isAuthenticated
              ? `/trips/${trip.id}/book?passengers=${passengers}`
              : `/login?next=${encodeURIComponent(
                  `/trips/${trip.id}/book?passengers=${passengers}`
                )}`;

            return (
              <div
                key={trip.id}
                className="p-5 hover:bg-[#F8FAF9] transition-all group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                  {/* Left: Departure Time, Route Motif, Availability, Vehicle Info */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-baseline gap-3">
                      <span className="text-2xl font-extrabold tracking-tight text-[#0A0A0A] font-mono tabular-nums">
                        {timeStr}
                      </span>
                      <span className="text-xs font-semibold text-[#66706A]">
                        {dateStr}
                      </span>
                    </div>

                    {/* Recurring Route Motif */}
                    <div className="text-base font-bold text-[#171717] tracking-tight flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-brand-green" />
                      <span>{originName}</span>
                      <span className="text-brand-green font-normal">──────→</span>
                      <span className="w-2 h-2 rounded-full border border-brand-green bg-white" />
                      <span>{destName}</span>
                    </div>
                    <div className="text-xs text-[#66706A]">{trip.purpose?.name}</div>

                    <div className="flex flex-wrap items-center gap-2.5 text-xs">
                      {availableSeats <= 0 ? (
                        <Badge variant="error">Full</Badge>
                      ) : !hasEnoughSeats ? (
                        <Badge variant="warning">
                          {availableSeats} {availableSeats === 1 ? "seat" : "seats"} left · {passengers} needed
                        </Badge>
                      ) : isFewSeats ? (
                        <Badge variant="warning">
                          Only {availableSeats} seats left
                        </Badge>
                      ) : (
                        <span className="text-brand-green font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-green" />
                          {availableSeats} seats available
                        </span>
                      )}

                      {/* Vehicle Information (Requirements 19, 20) */}
                      <span className="text-[#D1D8D4]">·</span>
                      {trip.vehicle ? (
                        <span className="text-[#171717] font-semibold bg-[#F3F6F4] px-2 py-0.5 rounded border border-[#E3E8E5]">
                          {trip.vehicle.name} (Plate: {trip.vehicle.plateNumber})
                        </span>
                      ) : (
                        <span className="text-[#D97706] font-semibold bg-[#FFFBEB] px-2 py-0.5 rounded border border-[#FDE68A] text-[11px]">
                          Vehicle to be assigned
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Fare & Primary Action */}
                  <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center gap-4 pt-3 sm:pt-0 border-t border-[#F3F6F4] sm:border-0">
                    <div className="sm:text-right">
                      <div className="text-2xl font-extrabold text-[#0A0A0A] font-mono tabular-nums leading-tight">
                        ETB {trip.farePerSeat}
                      </div>
                      <div className="text-[11px] text-[#87918B] font-medium">per passenger</div>
                    </div>

                    {hasEnoughSeats ? (
                      <Button size="default" asChild className="px-6 font-bold shadow-xs">
                        <Link href={bookingUrl}>Book Trip →</Link>
                      </Button>
                    ) : (
                      <span className="inline-flex h-9 items-center justify-center rounded-lg border border-[#E3E8EC] px-3.5 text-xs font-semibold text-[#71859A]">
                        {availableSeats <= 0 ? "Unavailable" : "Not enough seats"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
