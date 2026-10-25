import { EventForm } from "@/components/event-form";
import { DataTable, EmptyState, PageHeader, Panel, StatusBadge } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { orm } from "@/lib/db";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
  await requireRole("ADMIN");

  const events = await orm.TravelEvent.orderBy((event) => event.startsOn.asc()).all();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Travel Events & Demand Planning"
        description="Create and manage travel periods that organize transportation demand and scheduling. These events can be linked to routes and trip planning without hard-coding names in the application."
      />

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-base font-semibold tracking-tight text-zinc-950">
            Registered Events ({events.length})
          </h2>

          {events.length === 0 ? (
            <EmptyState
              title="No travel events configured"
              body="Add a new event to organize demand planning and relevant scheduled trips."
            />
          ) : (
            <DataTable headers={["Event", "Dates", "Status", "Description"]}>
              {events.map((event) => (
                <tr key={event.id}>
                  <td className="px-4 py-3 font-medium text-zinc-950">{event.name}</td>
                  <td className="px-4 py-3 text-xs text-zinc-600">
                    {formatDate(event.startsOn)} → {formatDate(event.endsOn)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={event.isActive ? "success" : "danger"}>
                      {event.isActive ? "Active" : "Inactive"}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-600 max-w-md">
                    {event.description ?? "—"}
                  </td>
                </tr>
              ))}
            </DataTable>
          )}
        </div>

        <div>
          <Panel className="p-6">
            <h3 className="text-sm font-semibold text-zinc-950 mb-3">Add Travel Event</h3>
            <EventForm />
          </Panel>
        </div>
      </div>
    </div>
  );
}
