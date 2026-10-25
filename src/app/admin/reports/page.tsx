import { PageHeader, Panel } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { orm } from "@/lib/db";

export const dynamic = "force-dynamic";

type MetricTone = "default" | "success" | "info" | "warning" | "danger";

function Metric({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  value: string | number;
  detail?: string;
  tone?: MetricTone;
}) {
  const toneClass = {
    default: "text-[#102A43]",
    success: "text-brand-green",
    info: "text-[#1D4ED8]",
    warning: "text-[#B45309]",
    danger: "text-[#B91C1C]",
  }[tone];

  return (
    <div className="min-w-0 rounded-lg border border-[#E7EDF3] bg-white p-4">
      <div className="truncate text-[10px] font-semibold uppercase tracking-wider text-[#71859A]">
        {label}
      </div>
      <div className={`mt-2 break-words text-sm font-bold tabular-nums sm:text-xl ${toneClass}`}>
        {value}
      </div>
      {detail ? <div className="mt-1 text-[11px] text-[#71859A]">{detail}</div> : null}
    </div>
  );
}

function ProgressBar({ value, tone = "green" }: { value: number; tone?: "green" | "blue" }) {
  return (
    <div
      className="h-2 overflow-hidden rounded-full bg-[#E7EDF3]"
      role="progressbar"
      aria-label="Percentage"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
    >
      <div
        className={`h-full rounded-full ${tone === "green" ? "bg-brand-green" : "bg-[#2563EB]"}`}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export default async function AdminReportsPage() {
  await requireRole("ADMIN");

  const now = new Date().toISOString();
  const bookingStatuses = ["CONFIRMED", "PENDING_REVIEW", "PENDING_PAYMENT", "REJECTED", "CANCELLED"] as const;
  const passengerStatuses = ["CHECKED_IN", "NO_SHOW", "NOT_CHECKED"] as const;

  const [bookingStatusTotals, passengerStatusTotals, scheduledTrips, approvedBookings, submittedPayments, unpaidBookings, cancelledBookings, openDemand] = await Promise.all([
    Promise.all(bookingStatuses.map((status) =>
      orm.Booking.where({ status }).aggregate((a) => ({ count: a.count() })),
    )),
    Promise.all(passengerStatuses.map((status) =>
      orm.Passenger.where({ checkInStatus: status }).aggregate((a) => ({ count: a.count() })),
    )),
    orm.Trip.where({ status: "PUBLISHED" })
      .where((trip) => trip.departureAt.gte(now))
      .include("route", (route) => route.include("originCampus").include("destination"))
      .all(),
    orm.Booking.where({ paymentStatus: "APPROVED" }).include("trip").all(),
    orm.Booking.where({ paymentStatus: "SUBMITTED" }).include("trip").all(),
    orm.Booking.where({ status: "PENDING_PAYMENT" }).include("trip").all(),
    orm.Booking.where({ status: "CANCELLED" }).include("trip").all(),
    orm.DemandRequest.where({ status: "OPEN" })
      .include("route", (route) => route.include("originCampus").include("destination"))
      .all(),
  ]);

  const bookingsByStatus = Object.fromEntries(
    bookingStatuses.map((status, index) => [status, bookingStatusTotals[index].count]),
  ) as Record<(typeof bookingStatuses)[number], number>;
  const checkInCounts = Object.fromEntries(
    passengerStatuses.map((status, index) => [status, passengerStatusTotals[index].count]),
  ) as Record<(typeof passengerStatuses)[number], number>;
  const totalPassengers = passengerStatusTotals.reduce((sum, item) => sum + item.count, 0);
  const approvedRevenue = approvedBookings.reduce(
    (sum, booking) => sum + (booking.trip?.farePerSeat ?? 0) * booking.partySize,
    0,
  );
  const pendingPaymentValue = [...submittedPayments, ...unpaidBookings].reduce(
    (sum, booking) => sum + (booking.trip?.farePerSeat ?? 0) * booking.partySize,
    0,
  );
  const refundRequests = cancelledBookings.filter((booking) =>
    booking.rejectionReason?.startsWith("REFUND_REQUESTED:"),
  );
  const refundValue = refundRequests.reduce(
    (sum, booking) => sum + (booking.trip?.farePerSeat ?? 0) * booking.partySize,
    0,
  );

  const fleet = scheduledTrips.reduce(
    (totals, trip) => ({
      capacity: totals.capacity + trip.seatCapacity,
      reserved: totals.reserved + trip.seatsReserved,
    }),
    { capacity: 0, reserved: 0 },
  );
  const availableSeats = fleet.capacity - fleet.reserved;
  const occupancy = fleet.capacity ? Math.round((fleet.reserved / fleet.capacity) * 100) : 0;
  const completedCheckIns = checkInCounts.CHECKED_IN + checkInCounts.NO_SHOW;
  const checkInRate = completedCheckIns
    ? Math.round((checkInCounts.CHECKED_IN / completedCheckIns) * 100)
    : 0;

  const demandByRoute = new Map<string, { name: string; passengers: number }>();
  for (const request of openDemand) {
    const key = request.routeId;
    const routeName = request.route?.name ?? "Route";
    const current = demandByRoute.get(key);
    demandByRoute.set(key, {
      name: routeName,
      passengers: (current?.passengers ?? 0) + request.passengerCount,
    });
  }
  const highestDemandRoute = [...demandByRoute.values()].sort((a, b) => b.passengers - a.passengers)[0];
  const requestedSeats = openDemand.reduce((sum, request) => sum + request.passengerCount, 0);

  const insights = [
    bookingsByStatus.PENDING_REVIEW > 0
      ? `${bookingsByStatus.PENDING_REVIEW} payment${bookingsByStatus.PENDING_REVIEW === 1 ? "" : "s"} require review`
      : null,
    requestedSeats > 0 ? `${requestedSeats} requested seat${requestedSeats === 1 ? "" : "s"} remain unserved` : null,
    highestDemandRoute
      ? `${highestDemandRoute.name} has the highest open demand (${highestDemandRoute.passengers} seats)`
      : null,
  ].filter((item): item is string => Boolean(item));

  return (
    <div className="space-y-6">
      <PageHeader title="Operational Reports" />

      {insights.length > 0 && (
        <section aria-label="Operational insights" className="flex flex-wrap gap-2">
          {insights.map((insight) => (
            <div key={insight} className="rounded-lg border border-[#DCE4EC] bg-[#F4F8FC] px-3 py-2 text-xs font-medium text-[#344B63]">
              {insight}
            </div>
          ))}
        </section>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel className="p-5">
          <h2 className="mb-4 text-sm font-bold text-[#102A43]">Revenue</h2>
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Total Revenue" value={`ETB ${approvedRevenue.toLocaleString()}`} tone="success" detail="Payments approved by staff" />
            <Metric label="Approved Payments" value={approvedBookings.length.toLocaleString()} detail="Confirmed payment proofs" tone="success" />
            <Metric label="Pending Payment Value" value={`ETB ${pendingPaymentValue.toLocaleString()}`} tone="info" detail={`${submittedPayments.length + unpaidBookings.length} awaiting completion or review`} />
            <Metric label="Refund Requested" value={`ETB ${refundValue.toLocaleString()}`} tone={refundValue ? "warning" : "default"} detail={`${refundRequests.length} cancellation request${refundRequests.length === 1 ? "" : "s"}`} />
          </div>
        </Panel>

        <Panel className="p-5">
          <h2 className="mb-4 text-sm font-bold text-[#102A43]">Bookings</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Metric label="Confirmed" value={bookingsByStatus.CONFIRMED} tone="success" />
            <Metric label="Pending Review" value={bookingsByStatus.PENDING_REVIEW} tone="info" />
            <Metric label="Awaiting Payment" value={bookingsByStatus.PENDING_PAYMENT} />
            <Metric label="Rejected" value={bookingsByStatus.REJECTED} tone="danger" />
            <Metric label="Cancelled" value={bookingsByStatus.CANCELLED} />
          </div>
        </Panel>

        <Panel className="p-5">
          <h2 className="mb-4 text-sm font-bold text-[#102A43]">Passengers</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="Total Passengers" value={totalPassengers.toLocaleString()} />
            <Metric label="Checked In" value={checkInCounts.CHECKED_IN.toLocaleString()} tone="success" />
            <Metric label="Pending Departure" value={checkInCounts.NOT_CHECKED.toLocaleString()} tone="info" />
            <Metric label="No-Shows" value={checkInCounts.NO_SHOW.toLocaleString()} tone="danger" />
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-xs text-[#52677D]"><span>Check-in rate</span><strong className="tabular-nums text-[#102A43]">{completedCheckIns ? `${checkInRate}%` : "—"}</strong></div>
            <ProgressBar value={checkInRate} />
            <p className="text-[11px] text-[#71859A]">Of passengers marked checked in or no-show</p>
          </div>
        </Panel>

        <Panel className="p-5">
          <h2 className="mb-4 text-sm font-bold text-[#102A43]">Fleet</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="Scheduled Trips" value={scheduledTrips.length.toLocaleString()} />
            <Metric label="Total Capacity" value={fleet.capacity.toLocaleString()} />
            <Metric label="Reserved Seats" value={fleet.reserved.toLocaleString()} />
            <Metric label="Available Seats" value={availableSeats.toLocaleString()} tone="success" />
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-xs text-[#52677D]"><span>Occupancy</span><strong className="tabular-nums text-[#102A43]">{occupancy}%</strong></div>
            <ProgressBar value={occupancy} tone="blue" />
          </div>
        </Panel>

        <Panel className="p-5 xl:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-[#102A43]">Demand</h2>
              <p className="mt-1 text-xs text-[#71859A]">Open requests not yet served by a scheduled trip.</p>
            </div>
            <Metric label="Unserved Demand" value={requestedSeats.toLocaleString()} detail={`${openDemand.length} open requests`} tone={requestedSeats ? "warning" : "default"} />
          </div>
          {highestDemandRoute ? (
            <div className="mt-4 flex items-center justify-between gap-4 border-t border-[#E7EDF3] pt-4 text-xs">
              <span className="text-[#52677D]">Highest demand route</span>
              <span className="text-right font-semibold text-[#102A43]">{highestDemandRoute.name}<span className="ml-2 font-mono text-[#B45309]">{highestDemandRoute.passengers} seats</span></span>
            </div>
          ) : (
            <p className="mt-4 border-t border-[#E7EDF3] pt-4 text-xs text-[#71859A]">No open travel demand.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}
