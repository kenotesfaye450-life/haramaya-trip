import { getCurrentAccount } from "@/lib/auth";
import { redirect } from "next/navigation";
import { orm } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const account = await getCurrentAccount();
  if (!account) {
    redirect("/login?next=/notifications");
  }

  // Fetch recent user bookings and demand requests
  const [bookings, demands] = await Promise.all([
    orm.Booking.where({ accountId: account.id })
      .include("trip", (t) =>
        t.include("route", (r) =>
          r.include("originCampus").include("destination")
        )
      )
      .orderBy((b) => b.updatedAt.desc())
      .all(),
    orm.DemandRequest.where({ accountId: account.id })
      .include("route", (r) =>
        r.include("originCampus").include("destination")
      )
      .orderBy((d) => d.updatedAt.desc())
      .all(),
  ]);

  type NotificationItem = {
    id: string;
    type: "CONFIRMED" | "PENDING_REVIEW" | "REJECTED" | "UNPAID" | "DEMAND" | "CANCELLED";
    title: string;
    description: string;
    date: Date;
    link: string;
    badgeVariant: "success" | "pending" | "error" | "warning" | "neutral";
  };

  const notifications: NotificationItem[] = [];

  for (const b of bookings) {
    const routeName = b.trip?.route
      ? `${b.trip.route.originCampus?.name} → ${b.trip.route.destination?.name}`
      : "University Transport";
    const date = new Date(b.updatedAt || b.createdAt);

    if (b.status === "CONFIRMED") {
      notifications.push({
        id: `b-conf-${b.id}`,
        type: "CONFIRMED",
        title: `Boarding Pass Ready: ${routeName}`,
        description: `Payment for booking ${b.reference} (${b.partySize} ${b.partySize === 1 ? "seat" : "seats"}) has been verified and confirmed. Your digital ticket is ready for boarding.`,
        date,
        link: `/bookings/${b.id}/ticket`,
        badgeVariant: "success",
      });
    } else if (b.status === "PENDING_REVIEW") {
      notifications.push({
        id: `b-rev-${b.id}`,
        type: "PENDING_REVIEW",
        title: `Payment Receipt Received: ${routeName}`,
        description: `Your bank transfer receipt for ${b.reference} is currently under station review. Verification is conducted during office hours.`,
        date,
        link: `/bookings/${b.id}`,
        badgeVariant: "pending",
      });
    } else if (b.status === "REJECTED" || b.paymentStatus === "REJECTED") {
      notifications.push({
        id: `b-rej-${b.id}`,
        type: "REJECTED",
        title: `Action Required: Payment Receipt Issue`,
        description: `Receipt for booking ${b.reference} could not be verified. ${b.rejectionReason ? `Reason: ${b.rejectionReason}` : "Please upload a clear proof document."}`,
        date,
        link: `/bookings/${b.id}`,
        badgeVariant: "error",
      });
    } else if (b.status === "PENDING_PAYMENT" && b.paymentStatus === "UNPAID") {
      notifications.push({
        id: `b-unpaid-${b.id}`,
        type: "UNPAID",
        title: `Reservation Held: Transfer Payment for ${routeName}`,
        description: `Booking ${b.reference} has seats reserved. Please complete payment within the hold window to guarantee boarding.`,
        date,
        link: `/bookings/${b.id}`,
        badgeVariant: "warning",
      });
    } else if (b.status === "CANCELLED") {
      notifications.push({
        id: `b-canc-${b.id}`,
        type: "CANCELLED",
        title: `Booking Cancelled: ${routeName}`,
        description: `Booking ${b.reference} has been cancelled and seat holds were released. ${b.rejectionReason || ""}`,
        date,
        link: `/bookings/${b.id}`,
        badgeVariant: "neutral",
      });
    }
  }

  for (const d of demands) {
    const routeName = d.route
      ? `${d.route.originCampus?.name} → ${d.route.destination?.name}`
      : "Route";
    const date = new Date(d.updatedAt || d.createdAt);

    if (d.status === "REVIEWED") {
      notifications.push({
        id: `d-rev-${d.id}`,
        type: "DEMAND",
        title: `Travel Demand Reviewed: ${routeName}`,
        description: `Your travel demand for ${d.passengerCount} passengers on ${d.travelDate} has been reviewed by fleet planners. Check departures for newly published trips.`,
        date,
        link: "/demand",
        badgeVariant: "success",
      });
    }
  }

  // Sort newest first
  notifications.sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="pb-4 border-b border-[#E3E8E5] flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0A0A0A]">
            Notifications
          </h1>
          <p className="text-xs text-[#66706A] mt-0.5">
            Real-time updates regarding your reservations, payment approvals, and travel demand.
          </p>
        </div>
        <Badge variant={notifications.length > 0 ? "success" : "neutral"}>
          {notifications.length} {notifications.length === 1 ? "update" : "updates"}
        </Badge>
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white border border-[#E3E8E5] rounded-xl p-12 text-center space-y-3 shadow-xs">
          <div className="w-10 h-10 mx-auto rounded-full bg-[#ECFDF5] text-brand-green flex items-center justify-center font-bold">
            ✓
          </div>
          <div className="text-sm font-bold text-[#0A0A0A]">All Caught Up</div>
          <p className="text-xs text-[#66706A] max-w-sm mx-auto">
            You do not have any pending notifications or booking alerts at this time.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-[#E3E8E5] rounded-xl divide-y divide-[#E3E8E5] shadow-xs overflow-hidden">
          {notifications.map((item) => (
            <Link
              key={item.id}
              href={item.link}
              className="block p-5 hover:bg-[#F8FAF9] transition-colors group"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#0A0A0A] group-hover:text-brand-green transition-colors">
                      {item.title}
                    </span>
                    <Badge variant={item.badgeVariant}>{item.type.replace("_", " ")}</Badge>
                  </div>
                  <p className="text-xs text-[#66706A] leading-relaxed">
                    {item.description}
                  </p>
                </div>
                <div className="text-[11px] font-mono text-[#87918B] sm:text-right flex-shrink-0">
                  {item.date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  ·{" "}
                  {item.date.toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
