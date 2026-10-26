import { EventForm } from "@/components/event-form";
import { DataTable, EmptyState, PageHeader, Panel, StatusBadge } from "@/components/ui";
import { requireRoleAt } from "@/lib/auth";
import { orm } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { TripPurposeForm } from "@/components/trip-purpose-form";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ editPurposeId?: string }>;
}) {
  await requireRoleAt("/admin/events", "ADMIN");

  const [{ editPurposeId }, events, purposes] = await Promise.all([
    searchParams,
    orm.TravelEvent.orderBy((event) => event.startsOn.asc()).all(),
    orm.TripPurpose.orderBy((purpose) => purpose.name.asc()).all(),
  ]);
  const purposeToEdit = purposes.find((purpose) => purpose.id === editPurposeId);

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

      <section className="space-y-4 border-t border-zinc-200 pt-8">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-zinc-950">
            Trip Purposes ({purposes.length})
          </h2>
          <p className="mt-1 text-xs text-zinc-600">
            Purposes describe the university travel cycle. They do not restrict the selected origin or destination.
          </p>
        </div>
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {purposes.length === 0 ? (
              <EmptyState title="No trip purposes configured" body="Add purposes to classify trips when administrators schedule them." />
            ) : (
              <DataTable headers={["Purpose", "Code", "Description", "Status", ""]}>
                {purposes.map((purpose) => (
                  <tr key={purpose.id}>
                    <td className="px-4 py-3 font-medium text-zinc-950">{purpose.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-600">{purpose.code}</td>
                    <td className="px-4 py-3 text-xs text-zinc-600">{purpose.description ?? "—"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={purpose.isActive ? "success" : "danger"}>
                        {purpose.isActive ? "Active" : "Inactive"}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link className="text-xs font-semibold text-zinc-700 hover:text-zinc-950" href={`/admin/events?editPurposeId=${purpose.id}`}>Edit</Link>
                    </td>
                  </tr>
                ))}
              </DataTable>
            )}
          </div>
          <Panel className="p-6">
            <h3 className="mb-3 text-sm font-semibold text-zinc-950">
              {purposeToEdit ? "Edit Trip Purpose" : "Add Trip Purpose"}
            </h3>
            <TripPurposeForm purposeToEdit={purposeToEdit} />
          </Panel>
        </div>
      </section>
    </div>
  );
}
