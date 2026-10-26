import Link from "next/link";
import { LocationForm, RouteForm } from "@/components/route-forms";
import { DataTable, EmptyState, PageHeader, Panel, StatusBadge } from "@/components/ui";
import { requireRoleAt } from "@/lib/auth";
import { orm } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminRoutesPage({
  searchParams,
}: {
  searchParams: Promise<{ editLocationId?: string }>;
}) {
  await requireRoleAt("/admin/routes", "ADMIN");

  const [{ editLocationId }, locations, routes] = await Promise.all([
    searchParams,
    orm.Location.orderBy((location) => location.name.asc()).all(),
    orm.Route.include("originLocation")
      .include("destinationLocation")
      .orderBy((route) => route.name.asc())
      .all(),
  ]);
  const locationToEdit = locations.find((location) => location.id === editLocationId);
  const activeLocations = locations.filter((location) => location.isActive);

  return (
    <div className="space-y-10">
      <PageHeader
        title="Locations & Routes"
        description="Manage all campus and external locations. Every active location can be used as either the origin or destination."
      />

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-[#0A0A0A]">Locations ({locations.length})</h2>
          <p className="text-xs text-[#66706A]">Locations are independent. Their type does not limit trip direction.</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {locations.length === 0 ? (
              <EmptyState title="No locations configured" body="Add the first location to make it available for route and trip planning." />
            ) : (
              <DataTable headers={["Location", "Code", "Type", "Status", ""]}>
                {locations.map((location) => (
                  <tr key={location.id}>
                    <td className="px-4 py-3 font-medium text-[#0A0A0A]">{location.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[#66706A]">{location.code}</td>
                    <td className="px-4 py-3 text-xs text-[#171717]">{location.kind === "CAMPUS" ? "Campus" : "External"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={location.isActive ? "success" : "danger"}>
                        {location.isActive ? "Active" : "Inactive"}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link className="text-xs font-semibold text-zinc-700 hover:text-zinc-950" href={`/admin/routes?editLocationId=${location.id}`}>Edit</Link>
                    </td>
                  </tr>
                ))}
              </DataTable>
            )}
          </div>
          <Panel className="p-5">
            <h3 className="mb-3 text-sm font-semibold text-[#0A0A0A]">
              {locationToEdit ? "Edit Location" : "Add Location"}
            </h3>
            <LocationForm locationToEdit={locationToEdit} />
            {locationToEdit ? <Link className="mt-3 inline-block text-xs text-zinc-600 underline" href="/admin/routes">Add another location</Link> : null}
          </Panel>
        </div>
      </section>

      <section className="space-y-4 border-t border-[#E3E8E5] pt-8">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-[#0A0A0A]">Configured Routes ({routes.length})</h2>
          <p className="text-xs text-[#66706A]">Route records are optional planning references. Trip purpose never restricts route endpoints.</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <DataTable headers={["Route", "From", "Destination", "Status"]}>
              {routes.map((route) => (
                <tr key={route.id}>
                  <td className="px-4 py-3 font-semibold text-[#0A0A0A]">{route.name}</td>
                  <td className="px-4 py-3 text-xs text-[#171717]">{route.originLocation.name}</td>
                  <td className="px-4 py-3 text-xs text-[#171717]">{route.destinationLocation.name}</td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={route.isActive ? "success" : "danger"}>
                      {route.isActive ? "Active" : "Disabled"}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
            </DataTable>
          </div>
          <Panel className="p-5">
            <h3 className="mb-3 text-sm font-semibold text-[#0A0A0A]">Add Route</h3>
            <RouteForm locations={activeLocations} />
          </Panel>
        </div>
      </section>
    </div>
  );
}
