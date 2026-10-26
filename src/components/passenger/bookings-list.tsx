import { orm } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface BookingItem {
  id: string;
  reference: string;
  partySize: number;
  status: string;
  paymentStatus: string;
  createdAt: Date | string;
  trip?: {
    id: string;
    departureAt: Date | string;
    farePerSeat: number;
    vehicle?: { name: string; plateNumber: string } | null;
    route?: {
      name?: string | null;
      originLocation?: { name: string } | null;
      destinationLocation?: { name: string } | null;
    } | null;
  } | null;
}

export async function BookingsList({ accountId }: { accountId: string }) {
  const bookings = (await orm.Booking.where({ accountId })
    .include("trip", (t) =>
      t
        .include("route", (r) =>
          r.include("originLocation").include("destinationLocation")
        )
        .include("vehicle")
    )
    .orderBy((b) => b.createdAt.desc())
    .all()) as BookingItem[];

  if (bookings.length === 0) {
    return (
      <div className="bg-white border border-[#E3E8E5] rounded-xl p-12 text-center space-y-4 shadow-xs">
        <div className="w-12 h-12 mx-auto rounded-full bg-[#ECFDF5] text-brand-green flex items-center justify-center">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-[#0A0A0A]">
          No bookings found
        </h3>
        <p className="text-xs text-[#66706A] max-w-sm mx-auto">
          You haven&apos;t booked any university transport trips yet. Search available departures to reserve your seat.
        </p>
        <div className="pt-2">
          <Button asChild size="default">
            <Link href="/">Find Transport →</Link>
          </Button>
        </div>
      </div>
    );
  }

  const now = new Date();

  // Categorize bookings prioritizing:
  // 1. Action Required (Unpaid or rejected proof needing re-upload)
  // 2. Upcoming Confirmed Trips
  // 3. Pending Review
  // 4. Past / Completed Trips
  // 5. Cancelled
  const actionRequired = bookings.filter(
    (b) => b.paymentStatus === "UNPAID" || b.paymentStatus === "REJECTED"
  );

  const upcoming = bookings.filter((b) => {
    if (b.status !== "CONFIRMED") return false;
    const dept = b.trip ? new Date(b.trip.departureAt) : null;
    return dept ? dept >= now : true;
  });

  const pendingReview = bookings.filter((b) => b.status === "PENDING_REVIEW");

  const past = bookings.filter((b) => {
    if (b.status === "CANCELLED" || b.paymentStatus === "REJECTED") return false;
    const dept = b.trip ? new Date(b.trip.departureAt) : null;
    return dept ? dept < now : false;
  });

  const cancelled = bookings.filter((b) => b.status === "CANCELLED");

  // Helper renderer for a list of bookings
  const renderBookingCard = (booking: BookingItem) => {
    const trip = booking.trip;
    const route = trip?.route;
    const departureDate = trip ? new Date(trip.departureAt) : null;
    const isApproved = booking.paymentStatus === "APPROVED";

    const statusBadge = (() => {
      if (isApproved) {
        return <Badge variant="success">Confirmed</Badge>;
      }
      if (booking.status === "PENDING_REVIEW") {
        return <Badge variant="pending">Under Review</Badge>;
      }
      if (booking.paymentStatus === "REJECTED") {
        return <Badge variant="error">Payment Rejected</Badge>;
      }
      if (booking.status === "CANCELLED") {
        return <Badge variant="neutral">Cancelled</Badge>;
      }
      return <Badge variant="warning">Action Required</Badge>;
    })();

    return (
      <div
        key={booking.id}
        className="p-5 hover:bg-[#F8FAF9] transition-colors"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xs font-bold text-[#0A0A0A]">
                {booking.reference}
              </span>
              {statusBadge}
            </div>

            <div className="text-base font-bold text-[#0A0A0A] tracking-tight flex items-center gap-2">
              <span>{route?.originLocation?.name || "Origin"}</span>
              <span className="text-brand-green">→</span>
              <span>{route?.destinationLocation?.name || "Destination"}</span>
            </div>

            <div className="text-xs text-[#66706A] font-medium flex flex-wrap items-center gap-1.5">
              {departureDate && (
                <>
                  <span className="font-mono font-bold text-[#0A0A0A]">
                    {departureDate.toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </span>
                  <span>·</span>
                  <span>
                    {departureDate.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span>·</span>
                </>
              )}
              <span>
                {booking.partySize} {booking.partySize === 1 ? "passenger" : "passengers"}
              </span>
              {trip?.vehicle && (
                <>
                  <span>·</span>
                  <span className="font-mono text-[#171717] bg-[#F3F6F4] px-1.5 py-0.2 rounded border border-[#E3E8E5]">
                    {trip.vehicle.name} ({trip.vehicle.plateNumber})
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {isApproved ? (
              <Button size="sm" asChild>
                <Link href={`/bookings/${booking.id}/ticket`} className="inline-flex items-center gap-1.5 font-bold shadow-xs">
                  <span>Digital Pass</span>
                  <span>→</span>
                </Link>
              </Button>
            ) : (
              <Button
                variant={booking.paymentStatus === "REJECTED" || booking.paymentStatus === "UNPAID" ? "primary" : "secondary"}
                size="sm"
                asChild
              >
                <Link href={`/bookings/${booking.id}`}>
                  {booking.paymentStatus === "REJECTED"
                    ? "Re-upload Receipt →"
                    : booking.status === "PENDING_REVIEW"
                    ? "View Status"
                    : "Complete Payment →"}
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* 1. Action Required Section */}
      {actionRequired.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#92400E]">
              Action Required ({actionRequired.length})
            </h2>
          </div>
          <div className="bg-white border-2 border-[#FDE68A] rounded-xl divide-y divide-[#E3E8E5] shadow-xs overflow-hidden">
            {actionRequired.map(renderBookingCard)}
          </div>
        </section>
      )}

      {/* 2. Upcoming Confirmed Trips */}
      {upcoming.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-green" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#064E3B]">
              Upcoming Trips ({upcoming.length})
            </h2>
          </div>
          <div className="bg-white border border-[#A7F3D0] rounded-xl divide-y divide-[#E3E8E5] shadow-xs overflow-hidden">
            {upcoming.map(renderBookingCard)}
          </div>
        </section>
      )}

      {/* 3. Pending Review Section */}
      {pendingReview.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#1E40AF]">
              Payment Verification in Progress ({pendingReview.length})
            </h2>
          </div>
          <div className="bg-white border border-[#BFDBFE] rounded-xl divide-y divide-[#E3E8E5] shadow-xs overflow-hidden">
            {pendingReview.map(renderBookingCard)}
          </div>
        </section>
      )}

      {/* 4. Past / Completed Trips */}
      {past.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#87918B]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#66706A]">
              Past Departures ({past.length})
            </h2>
          </div>
          <div className="bg-white border border-[#E3E8E5] rounded-xl divide-y divide-[#E3E8E5] shadow-xs overflow-hidden opacity-90">
            {past.map(renderBookingCard)}
          </div>
        </section>
      )}

      {/* 5. Cancelled Trips (only if non-empty) */}
      {cancelled.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#991B1B]">
              Cancelled Reservations ({cancelled.length})
            </h2>
          </div>
          <div className="bg-white border border-[#E3E8E5] rounded-xl divide-y divide-[#E3E8E5] shadow-xs overflow-hidden opacity-75">
            {cancelled.map(renderBookingCard)}
          </div>
        </section>
      )}
    </div>
  );
}