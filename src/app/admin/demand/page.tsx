import { DataTable, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { orm } from "@/lib/db";
import { formatDate, formatDateTime, requiredVehicles } from "@/lib/format";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminDemandPage() {
  await requireRole("ADMIN");

  // Fetch all open demand requests with related route, origin campus, and destination
  const openDemands = await orm.DemandRequest.where({ status: "OPEN" })
    .include("route", (r) => r.include("originCampus").include("destination"))
    .include("event")
    .include("account")
    .orderBy((d) => d.travelDate.asc())
    .all();

  // Aggregate by routeId + travelDate
  type AggregatedDemand = {
    key: string;
    routeId: string;
    routeName: string;
    originCampusName: string;
    destinationName: string;
    travelDate: string;
    eventName: string | null;
    totalPassengers: number;
    requestCount: number;
    demandIds: string[];
  };

  const aggregationMap = new Map<string, AggregatedDemand>();

  for (const d of openDemands) {
    const key = `${d.routeId}_${d.travelDate}`;
    const existing = aggregationMap.get(key);
    if (existing) {
      existing.totalPassengers += d.passengerCount;
      existing.requestCount += 1;
      existing.demandIds.push(d.id);
    } else {
      aggregationMap.set(key, {
        key,
        routeId: d.routeId,
        routeName: d.route?.name ?? "Route",
        originCampusName: d.route?.originCampus?.name ?? "Origin",
        destinationName: d.route?.destination?.name ?? "Destination",
        travelDate: d.travelDate,
        eventName: d.event?.name ?? null,
        totalPassengers: d.passengerCount,
        requestCount: 1,
        demandIds: [d.id],
      });
    }
  }

  const aggregatedList = Array.from(aggregationMap.values()).sort(
    (a, b) => b.totalPassengers - a.totalPassengers,
  );

  // Standard university bus capacity is 60 seats (Higer/Yutong standard)
  const STANDARD_BUS_CAPACITY = 60;
  const COASTER_CAPACITY = 30;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Travel Demand Planning & Capacity Recommendation"
        description="Passenger travel demand aggregation. The system calculates required seating capacity and recommends the number of vehicles to dispatch for each date."
      />

      {/* Capacity Recommendation Table */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-zinc-950">
            System Vehicle Recommendations
          </h2>
          <p className="text-xs text-zinc-600">
            Based on aggregated open travel requests. Recommendations suggest vehicle fleet allocation without auto-publishing trips.
          </p>
        </div>

        {aggregatedList.length === 0 ? (
          <EmptyState
            title="No open travel demand requests"
            body="When travelers request travel on routes before trips are published, demand recommendations will appear here."
          />
        ) : (
          <DataTable
            headers={[
              "Route",
              "Target Date",
              "Associated Event",
              "Total Passengers",
              "Requests",
              "Recommended Fleet",
              "Action",
            ]}
          >
            {aggregatedList.map((item) => {
              const busesNeeded = requiredVehicles(item.totalPassengers, STANDARD_BUS_CAPACITY);
              const coastersNeeded = requiredVehicles(item.totalPassengers, COASTER_CAPACITY);

              return (
                <tr key={item.key}>
                  <td className="px-4 py-3 font-medium text-zinc-950">
                    <p>{item.routeName}</p>
                    <p className="text-xs text-zinc-500">
                      {item.originCampusName} → {item.destinationName}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-zinc-900 font-semibold">{formatDate(item.travelDate)}</td>
                  <td className="px-4 py-3 text-xs text-zinc-600">{item.eventName ?? "General Travel"}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-base font-bold text-zinc-950">
                      {item.totalPassengers}
                    </span>{" "}
                    <span className="text-xs text-zinc-500">passengers</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-600">
                    {item.requestCount} submission{item.requestCount === 1 ? "" : "s"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <StatusBadge tone="success">
                        <strong>{busesNeeded}</strong> × 60-seat Bus{busesNeeded === 1 ? "" : "es"}
                      </StatusBadge>
                      <p className="text-[11px] text-zinc-500">
                        or {coastersNeeded} × 30-seat Coaster{coastersNeeded === 1 ? "" : "s"}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/trips?new=1&routeId=${item.routeId}&departureDate=${item.travelDate}`}
                      className="bg-zinc-950 text-white px-3 py-1.5 text-xs font-medium hover:bg-zinc-800"
                    >
                      Schedule Trip →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </DataTable>
        )}
      </div>

      {/* Individual Request Log */}
      <div className="space-y-4 pt-6 border-t border-zinc-200">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-zinc-950">
            Individual Demand Submissions ({openDemands.length})
          </h2>
          <p className="text-xs text-zinc-600">
            Raw requests submitted by registered accounts.
          </p>
        </div>

        <DataTable headers={["Traveler", "Route", "Date", "Party Size", "Note", "Submitted Date"]}>
          {openDemands.map((d) => (
            <tr key={d.id}>
              <td className="px-4 py-3 text-xs">
                <p className="font-medium text-zinc-950">{d.account.fullName}</p>
                <p className="text-zinc-500">{d.account.email}</p>
              </td>
              <td className="px-4 py-3 text-xs font-medium">{d.route?.name}</td>
              <td className="px-4 py-3 text-xs">{formatDate(d.travelDate)}</td>
              <td className="px-4 py-3 text-xs font-semibold">{d.passengerCount}</td>
              <td className="px-4 py-3 text-xs text-zinc-600 max-w-xs truncate">{d.note ?? "—"}</td>
              <td className="px-4 py-3 text-xs text-zinc-400">{formatDateTime(d.createdAt)}</td>
            </tr>
          ))}
        </DataTable>
      </div>
    </div>
  );
}
