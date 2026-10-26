import { DemandForm } from "@/components/demand-form";
import { DataTable, EmptyState, PageHeader, Panel, StatusBadge } from "@/components/ui";
import { requireAccount } from "@/lib/auth";
import { orm } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DemandPage({
  searchParams,
}: {
  searchParams?: Promise<{ from?: string; to?: string; date?: string; passengers?: string }>;
}) {
  const account = await requireAccount("/demand");
  const params = searchParams ? await searchParams : {};

  const [locations, events, userDemands] = await Promise.all([
    orm.Location.where({ isActive: true }).orderBy((location) => location.name.asc()).all(),
    orm.TravelEvent.where({ isActive: true }).all(),
    orm.DemandRequest.where({ accountId: account.id })
      .include("originLocation")
      .include("destinationLocation")
      .include("event")
      .orderBy((d) => d.createdAt.desc())
      .all(),
  ]);

  const matchedFrom = locations.find((location) =>
    location.id === params.from || location.code.toLowerCase() === params.from?.toLowerCase(),
  );
  const matchedTo = locations.find((location) =>
    location.id === params.to || location.code.toLowerCase() === params.to?.toLowerCase(),
  );

  const formattedEvents = events.map((e) => ({
    id: e.id,
    name: e.name,
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Travel Demand Planning"
        description="Submit your travel demand before scheduled trips are published. University planners aggregate passenger requests to estimate required vehicle capacity."
      />

      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Panel className="p-6">
            <h2 className="text-base font-semibold tracking-tight text-zinc-950 mb-2">
              Request Travel Service
            </h2>
            <p className="text-xs text-zinc-600 mb-6">
              When enough students or staff request a route on a specific date, administrators schedule official trips with appropriate vehicle capacity.
            </p>
            <DemandForm
              locations={locations}
              events={formattedEvents}
              initialFromLocationId={matchedFrom?.id}
              initialToLocationId={matchedTo?.id}
              initialDate={params.date}
              initialPassengers={params.passengers ? parseInt(params.passengers, 10) : 1}
            />
          </Panel>
        </div>

        <div className="lg:col-span-3 space-y-4">
          <h2 className="text-base font-semibold tracking-tight text-zinc-950">
            My Travel Requests ({userDemands.length})
          </h2>
          {userDemands.length === 0 ? (
            <EmptyState
              title="No demand requests yet"
              body="Submit a request using the form on the left if you don't find a suitable published trip."
            />
          ) : (
            <DataTable headers={["From → Destination", "Travel Date", "Passengers", "Status", "Submitted"]}>
              {userDemands.map((demand) => (
                <tr key={demand.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-950">
                      {demand.originLocation.name} → {demand.destinationLocation.name}
                    </p>
                    {demand.event ? (
                      <p className="text-[11px] text-zinc-400 mt-0.5">{demand.event.name}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 font-medium text-zinc-900">{formatDate(demand.travelDate)}</td>
                  <td className="px-4 py-3 text-zinc-950 font-semibold">{demand.passengerCount}</td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      tone={
                        demand.status === "REVIEWED"
                          ? "success"
                          : demand.status === "CLOSED"
                          ? "neutral"
                          : "warning"
                      }
                    >
                      {demand.status}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{formatDateTime(demand.createdAt)}</td>
                </tr>
              ))}
            </DataTable>
          )}
        </div>
      </div>
    </div>
  );
}
