import { getCurrentAccount } from "@/lib/auth";
import { redirect } from "next/navigation";
import { authPageHref } from "@/lib/return-to";
import { orm } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const account = await getCurrentAccount();
  if (!account) redirect(authPageHref("login", "/admin"));
  if (account.role !== "ADMIN") redirect("/");

  const now = new Date();
  // Fetch a small working set for the dashboard and exact aggregate counts.
  const [pendingPayments, pendingPaymentTotal, allTrips, confirmedBookings, scheduledTripTotals, openDemandTotals, approvedBookings] = await Promise.all([
    orm.Booking.where({ status: "PENDING_REVIEW" })
      .include("account")
      .include("trip", (t) =>
        t.include("route", (r) =>
          r.include("originLocation").include("destinationLocation")
        )
      )
      .orderBy((b) => b.createdAt.asc())
      .limit(5)
      .all(),
    orm.Booking.where({ status: "PENDING_REVIEW" }).aggregate((a) => ({ count: a.count() })),
    orm.Trip.include("route", (r) =>
      r.include("originLocation").include("destinationLocation")
    )
      .include("vehicle")
      .where((trip) => trip.departureAt.gte(now.toISOString()))
      .orderBy((t) => t.departureAt.asc())
      .limit(50)
      .all(),
    orm.Booking.where({ status: "CONFIRMED" }).aggregate((a) => ({
      count: a.count(),
      passengers: a.sum("partySize"),
    })),
    orm.Trip.where({ status: "PUBLISHED" })
      .where((trip) => trip.departureAt.gte(now.toISOString()))
      .aggregate((a) => ({
        count: a.count(),
        capacity: a.sum("seatCapacity"),
        reserved: a.sum("seatsReserved"),
      })),
    orm.DemandRequest.where({ status: "OPEN" }).aggregate((a) => ({
      requests: a.count(),
      passengers: a.sum("passengerCount"),
    })),
    orm.Booking.where({ paymentStatus: "APPROVED" }).include("trip").all(),
  ]);

  const approvedRevenue = approvedBookings.reduce(
    (total, booking) => total + (booking.trip?.farePerSeat ?? 0) * booking.partySize,
    0,
  );
  const occupancy = scheduledTripTotals.capacity
    ? Math.round(((scheduledTripTotals.reserved ?? 0) / scheduledTripTotals.capacity) * 100)
    : 0;

  const upcomingTrips = allTrips
    .filter((trip) => new Date(trip.departureAt) >= now)
    .slice(0, 8);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E3E8E5]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0A0A0A]">
            Overview
          </h1>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="secondary" size="sm" asChild>
            <Link href="/admin/trips">Trips Management</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/admin/payments" className="inline-flex items-center gap-1.5">
              <span>Review Payments</span>
              {pendingPayments.length > 0 && (
                <span className="bg-white/20 text-white px-1.5 py-0.2 rounded text-[11px] font-mono">
                  {pendingPaymentTotal.count}
                </span>
              )}
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {[
          { label: "Revenue", value: `ETB ${approvedRevenue.toLocaleString()}`, detail: "Approved payments", href: "/admin/reports", tone: "text-brand-green" },
          { label: "Passengers", value: (confirmedBookings.passengers ?? 0).toLocaleString(), detail: "Confirmed bookings", href: "/admin/reports", tone: "text-[#102A43]" },
          { label: "Occupancy", value: `${occupancy}%`, detail: `${scheduledTripTotals.reserved ?? 0} / ${scheduledTripTotals.capacity ?? 0} seats`, href: "/admin/trips", tone: "text-[#102A43]" },
          { label: "Scheduled Trips", value: (scheduledTripTotals.count ?? 0).toLocaleString(), detail: "Published departures", href: "/admin/trips", tone: "text-[#102A43]" },
          { label: "Pending Payments", value: pendingPaymentTotal.count.toLocaleString(), detail: "Need review", href: "/admin/payments", tone: pendingPaymentTotal.count ? "text-[#1D4ED8]" : "text-[#102A43]" },
          { label: "Unserved Demand", value: (openDemandTotals.passengers ?? 0).toLocaleString(), detail: `${openDemandTotals.requests ?? 0} open requests`, href: "/admin/demand", tone: openDemandTotals.passengers ? "text-[#B45309]" : "text-[#102A43]" },
        ].map((metric) => (
          <Link key={metric.label} href={metric.href} className="min-w-0 rounded-xl border border-[#DCE4EC] bg-white p-4 transition-colors hover:border-[#AFC7DD] hover:bg-[#FBFDFF]">
            <div className="truncate text-[10px] font-semibold uppercase tracking-wider text-[#647A91]">{metric.label}</div>
            <div className={`mt-2 break-words text-base font-bold tabular-nums sm:text-xl ${metric.tone}`}>{metric.value}</div>
            <div className="mt-1 truncate text-[11px] text-[#71859A]">{metric.detail}</div>
          </Link>
        ))}
      </div>

      {/* Operational Payments Queue */}
      {pendingPayments.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-[#0A0A0A] uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
              <span>Payments Awaiting Review</span>
            </h2>
            <Link
              href="/admin/payments"
              className="text-xs text-brand-green hover:text-[#066044] underline font-semibold"
            >
              View all pending ({pendingPaymentTotal.count}) →
            </Link>
          </div>

          <div className="bg-white border border-[#E3E8E5] rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAF9] border-b border-[#E3E8E5] text-[#66706A] font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3">Passenger</th>
                    <th className="px-4 py-3">Route</th>
                    <th className="px-4 py-3">Seats</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3E8E5]/70">
                  {pendingPayments.map((b) => (
                    <tr key={b.id} className="hover:bg-[#F8FAF9]/80 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-[#0A0A0A]">
                        {b.reference}
                      </td>
                      <td className="px-4 py-3 font-semibold text-[#171717]">
                        {b.account?.fullName || "Student"}
                      </td>
                      <td className="px-4 py-3 text-[#374151]">
                        {b.trip?.route?.originLocation?.name || "Campus"}{" "}
                        <span className="text-brand-green">→</span>{" "}
                        {b.trip?.route?.destinationLocation?.name || "Destination"}
                      </td>
                      <td className="px-4 py-3 text-[#66706A] font-mono">
                        {b.partySize}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-[#0A0A0A]">
                        ETB {(b.trip?.farePerSeat || 0) * b.partySize}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" asChild>
                          <Link href="/admin/payments">Review</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Upcoming Departures Table */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-[#0A0A0A] uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-green" />
            <span>Scheduled Departures</span>
          </h2>
          <Link
            href="/admin/trips"
            className="text-xs text-brand-green hover:text-[#066044] underline font-semibold"
          >
            Manage all trips →
          </Link>
        </div>

        <div className="bg-white border border-[#E3E8E5] rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAF9] border-b border-[#E3E8E5] text-[#66706A] font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Departure</th>
                  <th className="px-4 py-3">Route</th>
                  <th className="px-4 py-3">Vehicle</th>
                  <th className="px-4 py-3">Occupancy</th>
                  <th className="px-4 py-3">Fare</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E8E5]/70">
                {upcomingTrips.map((t) => {
                  const dept = new Date(t.departureAt);
                  return (
                    <tr key={t.id} className="hover:bg-[#F8FAF9]/80 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-[#0A0A0A]">
                        {dept.toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })}{" "}
                        <span className="text-[#66706A] font-normal">
                          · {dept.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-[#171717]">
                        {t.route?.originLocation?.name || "Campus"}{" "}
                        <span className="text-brand-green">→</span>{" "}
                        {t.route?.destinationLocation?.name || "Destination"}
                      </td>
                      <td className="px-4 py-3 text-[#66706A] font-mono">
                        {t.vehicle?.plateNumber || "Unassigned"}
                      </td>
                      <td className="px-4 py-3 font-mono text-[#374151]">
                        {t.seatsReserved} / {t.seatCapacity} seats
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-[#0A0A0A]">
                        ETB {t.farePerSeat}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            t.status === "PUBLISHED"
                              ? "success"
                              : t.status === "CLOSED"
                              ? "warning"
                              : "neutral"
                          }
                        >
                          {t.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/staff/check-in/${t.id}`}
                          className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-lg border border-[#E3E8E5] hover:bg-[#F3F6F4] text-[#171717] transition-colors"
                        >
                          Check-in
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
