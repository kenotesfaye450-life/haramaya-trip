import { orm } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export async function ActionRequired({ accountId }: { accountId: string }) {
  const pendingBooking = await orm.Booking.where({
    accountId,
  })
    .include("trip", (t) =>
      t.include("route", (r) =>
        r.include("originCampus").include("destination")
      )
    )
    .orderBy((b) => b.createdAt.desc())
    .all();

  const actionBooking = pendingBooking.find(
    (b) => b.paymentStatus === "UNPAID" || b.status === "PENDING_REVIEW" || b.paymentStatus === "REJECTED"
  );

  if (!actionBooking) {
    return null;
  }

  const trip = actionBooking.trip;
  const route = trip?.route;
  const isPendingReview = actionBooking.status === "PENDING_REVIEW";
  const isRejected = actionBooking.paymentStatus === "REJECTED";

  return (
    <section className="space-y-2">
      <div className="text-[11px] font-bold text-[#87918B] uppercase tracking-wider">
        Action Required
      </div>
      <div
        className={`bg-white border rounded-xl p-5 shadow-xs ${
          isPendingReview
            ? "border-[#BFDBFE] border-l-4 border-l-[#2563EB]"
            : isRejected
            ? "border-[#FECACA] border-l-4 border-l-[#DC2626]"
            : "border-[#FDE68A] border-l-4 border-l-[#D97706]"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-[#0A0A0A]">
                {actionBooking.reference}
              </span>
              {isPendingReview ? (
                <Badge variant="pending">Payment Under Review</Badge>
              ) : isRejected ? (
                <Badge variant="error">Payment Rejected</Badge>
              ) : (
                <Badge variant="warning">Payment Required</Badge>
              )}
            </div>
            <div className="text-sm font-bold text-[#171717]">
              {route
                ? `${route.originCampus?.name ?? "Campus"} → ${route.destination?.name ?? "Destination"}`
                : "Scheduled Trip"}
            </div>
            <div className="text-xs text-[#66706A]">
              {isPendingReview
                ? "Your payment proof is currently under review by transportation administration."
                : isRejected
                ? "Your payment proof was rejected. Please review administrator notes and re-upload."
                : "Follow University Transport’s payment instructions and submit your receipt."}
            </div>
          </div>
          <div className="flex-shrink-0">
            <Button size="sm" asChild>
              <Link href={`/bookings/${actionBooking.id}`}>
                {isPendingReview ? "View Status" : "Complete Payment →"}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
