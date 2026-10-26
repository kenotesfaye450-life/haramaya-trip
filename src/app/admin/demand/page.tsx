import Link from "next/link";
import { DataTable, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { requireRoleAt } from "@/lib/auth";
import { orm } from "@/lib/db";
import { formatDate, formatDateTime, requiredVehicles } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminDemandPage() {
  await requireRoleAt("/admin/demand", "ADMIN");

  const openDemands = await orm.DemandRequest.where({ status: "OPEN" })
    .include("originLocation")
    .include("destinationLocation")
    .include("event")
    .include("account")
    .orderBy((demand) => demand.travelDate.asc())
    .all();

  type AggregatedDemand = {
    key: string;
    originLocationId: string;
    destinationLocationId: string;
    originName: string;
    destinationName: string;
    travelDate: string;
    eventName: string | null;
    totalPassengers: number;
    requestCount: number;
  };

  const demandByService = new Map<string, AggregatedDemand>();
  for (const demand of openDemands) {
    const key = `${demand.originLocationId}_${demand.destinationLocationId}_${demand.travelDate}`;
    const current = demandByService.get(key);
    if (current) {
      current.totalPassengers += demand.passengerCount;
      current.requestCount += 1;
    } else {
      demandByService.set(key, {
        key,
        originLocationId: demand.originLocationId,
        destinationLocationId: demand.destinationLocationId,
        originName: demand.originLocation.name,
        destinationName: demand.destinationLocation.name,
        travelDate: demand.travelDate,
        eventName: demand.event?.name ?? null,
        totalPassengers: demand.passengerCount,
        requestCount: 1,
      });
    }
  }

  const aggregatedList = Array.from(demandByService.values()).sort(
    (a, b) => b.totalPassengers - a.totalPassengers,
  );
  const busCapacity = 60;
  const coasterCapacity = 30;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Travel Demand Planning & Capacity Recommendation"
        description="Demand is grouped by origin, destination, and date. Recommendations support staff planning and never publish trips automatically."
      />

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-zinc-950">Suggested Vehicle Capacity</h2>
          <p className="text-xs text-zinc-600">Recommendations use open passenger requests for each location pair and travel date.</p>
        </div>
        {aggregatedList.length === 0 ? (
          <EmptyState title="No open travel demand requests" body="When travelers request a service without a published trip, planning recommendations appear here." />
        ) : (
          <DataTable headers={["From → Destination", "Target Date", "Event", "Passengers", "Requests", "Suggested Fleet", "Action"]}>
            {aggregatedList.map((item) => {
              const busesNeeded = requiredVehicles(item.totalPassengers, busCapacity);
              const coastersNeeded = requiredVehicles(item.totalPassengers, coasterCapacity);
              const scheduleHref = `/admin/trips?create=true&fromLocationId=${encodeURIComponent(item.originLocationId)}&toLocationId=${encodeURIComponent(item.destinationLocationId)}&departureDate=${encodeURIComponent(item.travelDate)}`;
              return (
                <tr key={item.key}>
                  <td className="px-4 py-3 font-medium text-zinc-950">{item.originName} → {item.destinationName}</td>
                  <td className="px-4 py-3 font-semibold text-zinc-900">{formatDate(item.travelDate)}</td>
                  <td className="px-4 py-3 text-xs text-zinc-600">{item.eventName ?? "General travel"}</td>
                  <td className="px-4 py-3 font-mono font-bold text-zinc-950">{item.totalPassengers}</td>
                  <td className="px-4 py-3 text-xs text-zinc-600">{item.requestCount}</td>
                  <td className="px-4 py-3">
                    <StatusBadge tone="success">{busesNeeded} × {busCapacity}-seat bus{busesNeeded === 1 ? "" : "es"}</StatusBadge>
                    <p className="mt-1 text-[11px] text-zinc-500">or {coastersNeeded} × {coasterCapacity}-seat coaster{coastersNeeded === 1 ? "" : "s"}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={scheduleHref} className="inline-flex bg-zinc-950 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800">Review trip →</Link>
                  </td>
                </tr>
              );
            })}
          </DataTable>
        )}
      </section>

      <section className="space-y-4 border-t border-zinc-200 pt-6">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-zinc-950">Individual Demand Submissions ({openDemands.length})</h2>
          <p className="text-xs text-zinc-600">Submitted travel requests grouped into the recommendations above.</p>
        </div>
        <DataTable headers={["Traveler", "From → Destination", "Date", "Party Size", "Note", "Submitted"]}>
          {openDemands.map((demand) => (
            <tr key={demand.id}>
              <td className="px-4 py-3 text-xs">
                <p className="font-medium text-zinc-950">{demand.account.fullName}</p>
                <p className="text-zinc-500">{demand.account.email}</p>
              </td>
              <td className="px-4 py-3 text-xs font-medium">{demand.originLocation.name} → {demand.destinationLocation.name}</td>
              <td className="px-4 py-3 text-xs">{formatDate(demand.travelDate)}</td>
              <td className="px-4 py-3 text-xs font-semibold">{demand.passengerCount}</td>
              <td className="max-w-xs truncate px-4 py-3 text-xs text-zinc-600">{demand.note ?? "—"}</td>
              <td className="px-4 py-3 text-xs text-zinc-400">{formatDateTime(demand.createdAt)}</td>
            </tr>
          ))}
        </DataTable>
      </section>
    </div>
  );
}
