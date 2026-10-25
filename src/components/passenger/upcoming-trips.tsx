import { orm } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export async function UpcomingTrips({ accountId }: { accountId: string }) {
  const bookings = await orm.Booking.where({
    accountId,
    paymentStatus: "APPROVED",
  })
    .include("trip", (t) =>
      t.include("route", (r) =>
        r.include("originCampus").include("destination")
      )
    )
    .include("passengers")
    .orderBy((b) => b.createdAt.desc())
    .all();

  const now = new Date();
  const upcomingBooking = bookings.find((b) => {
    if (!b.trip) return false;
    return new Date(b.trip.departureAt) >= new Date(now.getTime() - 2 * 3600000);
  });

  if (!upcomingBooking || !upcomingBooking.trip) {
    return null;
  }

  const trip = upcomingBooking.trip;
  const route = trip.route;
  const passengerCount = upcomingBooking.passengers?.length || upcomingBooking.partySize;

  const departureDate = new Date(trip.departureAt);
  const timeStr = departureDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const dateStr = departureDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    weekday: "short",
  });

  return (
    <section className="space-y-2">
      <div className="text-[11px] font-bold text-[#87918B] uppercase tracking-wider">
        Next Departure
      </div>
      <div className="bg-white border border-[#E3E8E5] border-l-4 border-l-brand-green rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold tracking-tight text-[#0A0A0A] font-mono tabular-nums">
                {timeStr}
              </span>
              <span className="text-xs font-semibold text-brand-green bg-[#ECFDF5] px-2 py-0.5 rounded-md border border-[#A7F3D0]">
                {dateStr}
              </span>
            </div>

            {/* Route Motif */}
            <div className="text-base font-bold text-[#171717] flex items-center gap-2">
              <span>{route?.originCampus?.name ?? "Main Campus"}</span>
              <span className="text-brand-green font-normal">──→</span>
              <span>{route?.destination?.name ?? "Destination"}</span>
            </div>

            <div className="flex items-center gap-3 text-xs text-[#66706A]">
              <Badge variant="success">Confirmed Pass</Badge>
              <span>·</span>
              <span>
                {passengerCount} {passengerCount === 1 ? "passenger" : "passengers"}
              </span>
              <span>·</span>
              <span className="font-mono text-[#87918B]">{upcomingBooking.reference}</span>
            </div>
          </div>

          <div className="flex-shrink-0">
            <Button size="default" asChild className="font-bold shadow-xs">
              <Link href={`/bookings/${upcomingBooking.id}/ticket`}>
                View Digital Ticket →
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
