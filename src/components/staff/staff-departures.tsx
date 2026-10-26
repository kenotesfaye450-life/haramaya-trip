import { orm } from "@/lib/db";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export async function StaffDepartures() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Fetch published trips with routes, vehicles, bookings, and passengers
  const allTrips = await orm.Trip.where({
    status: "PUBLISHED",
  })
    .include("route", (r) =>
      r.include("originLocation").include("destinationLocation")
    )
    .include("vehicle")
    .include("bookings", (b) => b.include("passengers"))
    .orderBy((t) => t.departureAt.asc())
    .all();

  // Filter for today's trips
  const todayTrips = allTrips.filter((t) => {
    const dept = new Date(t.departureAt);
    return dept >= today && dept < tomorrow;
  });

  // If none scheduled today, show next available upcoming trips
  const displayTrips = todayTrips.length > 0 ? todayTrips : allTrips.slice(0, 5);
  const isTodayOnly = todayTrips.length > 0;

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Operational Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3 pb-4 border-b border-[#E3E8E5]">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#0A0A0A]">
            Today&apos;s Departures
          </h1>
          <p className="text-xs font-mono text-[#66706A] mt-1 uppercase tracking-wider">
            Station Console · {currentDate}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" asChild>
            <Link href="/staff/search" className="inline-flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Search Passenger</span>
            </Link>
          </Button>
        </div>
      </div>

      {!isTodayOnly && (
        <div className="bg-[#F8FAF9] border border-[#E3E8E5] text-[#66706A] text-xs px-4 py-3 rounded-xl flex items-center gap-2">
          <svg className="w-4 h-4 text-brand-green flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>No departures scheduled specifically for today. Showing upcoming active scheduled departures:</span>
        </div>
      )}

      {displayTrips.length === 0 ? (
        <div className="bg-white border border-[#E3E8E5] rounded-xl p-12 text-center space-y-3 shadow-xs">
          <div className="text-base font-bold text-[#0A0A0A]">
            No Departures Scheduled
          </div>
          <p className="text-xs text-[#66706A] max-w-sm mx-auto">
            There are currently no published departures in the system.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayTrips.map((trip) => {
            const departureDate = new Date(trip.departureAt);
            const timeStr = departureDate.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            });
            const dateStr = departureDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });

            // Calculate exact real check-in numbers from database
            const allPassengers = (trip.bookings || []).flatMap(
              (b) => b.passengers || []
            );
            const checkedInCount = allPassengers.filter(
              (p) => p.checkInStatus === "CHECKED_IN"
            ).length;
            const totalPassengers = trip.seatsReserved || allPassengers.length || 0;
            const capacity = trip.seatCapacity;

            const originName = trip.route?.originLocation?.name || "Origin";
            const destName = trip.route?.destinationLocation?.name || "Destination";

            return (
              <div
                key={trip.id}
                className="bg-white border border-[#E3E8E5] rounded-xl p-5 hover:border-brand-green/40 transition-colors shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: Time, Route, Checked in */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-baseline gap-3">
                      <span className="text-3xl font-extrabold tracking-tight text-[#0A0A0A] font-mono">
                        {timeStr}
                      </span>
                      <span className="text-xs font-semibold text-[#66706A]">
                        {dateStr}
                      </span>
                      {trip.vehicle && (
                        <span className="text-xs font-mono font-semibold text-[#171717] bg-[#F3F6F4] px-2.5 py-0.5 rounded-md border border-[#E3E8E5]">
                          {trip.vehicle.plateNumber}
                        </span>
                      )}
                    </div>

                    <div className="text-base font-bold text-[#0A0A0A] tracking-tight flex items-center gap-2">
                      <span>{originName}</span>
                      <span className="text-brand-green">→</span>
                      <span>{destName}</span>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <span className="font-bold text-brand-green bg-[#ECFDF5] px-2.5 py-0.5 rounded-md border border-[#A7F3D0]">
                        {checkedInCount} / {totalPassengers} checked in
                      </span>
                      <span className="text-[#E3E8E5]">·</span>
                      <span className="text-[#66706A]">
                        {capacity} total vehicle seats
                      </span>
                    </div>
                  </div>

                  {/* Right: Operational Scan Action */}
                  <div className="flex-shrink-0 pt-2 sm:pt-0">
                    <Button size="large" asChild className="w-full sm:w-auto px-6 font-bold shadow-xs">
                      <Link href={`/staff/check-in/${trip.id}`}>
                        Scan Ticket →
                      </Link>
                    </Button>
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