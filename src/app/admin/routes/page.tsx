import { LocationForm, RouteForm } from "@/components/route-forms";
import { DataTable, PageHeader, Panel, StatusBadge } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { orm } from "@/lib/db";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminRoutesPage() {
  await requireRole("ADMIN");

  const [campuses, destinations, routes] = await Promise.all([
    orm.Campus.orderBy((c) => c.name.asc()).all(),
    orm.Destination.orderBy((d) => d.name.asc()).all(),
    orm.Route.include("originCampus")
      .include("destination")
      .orderBy((r) => r.name.asc())
      .all(),
  ]);

  return (
    <div className="space-y-10">
      <PageHeader
        title="Routes & Transportation Locations"
        description="Configure valid transportation routes linking university campuses, transit terminals, and regional cities. Supports bidirectional outbound and return travel."
      />

      {/* Routes Section */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-[#0A0A0A]">Configured Routes ({routes.length})</h2>
          <p className="text-xs text-[#66706A]">Active transportation links available for scheduling trips.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <DataTable headers={["Route Display Name", "Departure Origin", "Arrival Destination", "Status", "Created"]}>
              {routes.map((route) => (
                <tr key={route.id} className="hover:bg-[#F8FAF9]/80 transition-colors">
                  <td className="px-4 py-3 font-semibold text-[#0A0A0A]">{route.name}</td>
                  <td className="px-4 py-3 text-xs text-[#171717]">{route.originCampus.name}</td>
                  <td className="px-4 py-3 text-xs text-[#171717]">{route.destination.name}</td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={route.isActive ? "success" : "danger"}>
                      {route.isActive ? "Active" : "Disabled"}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#66706A] font-mono">{formatDateTime(route.createdAt)}</td>
                </tr>
              ))}
            </DataTable>
          </div>

          <div>
            <Panel className="p-5">
              <h3 className="text-sm font-bold text-[#0A0A0A] mb-3">Create New Route</h3>
              <RouteForm campuses={campuses} destinations={destinations} />
            </Panel>
          </div>
        </div>
      </section>

      {/* Transportation Network Locations Grid */}
      <div className="pt-6 border-t border-[#E3E8E5]">
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-[#0A0A0A]">
                Transportation Hubs & Locations ({campuses.length})
              </h2>
              <p className="text-xs text-[#66706A]">
                Official campuses, stations, cities, and pickup terminals in the university transit network.
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <DataTable headers={["Location Name", "Code", "Status"]}>
                {campuses.map((campus) => (
                  <tr key={campus.id} className="hover:bg-[#F8FAF9]/80 transition-colors">
                    <td className="px-4 py-3 font-semibold text-[#0A0A0A]">{campus.name}</td>
                    <td className="px-4 py-3 font-mono text-xs font-bold text-brand-green bg-[#ECFDF5] px-2 py-0.5 rounded">
                      {campus.code}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={campus.isActive ? "success" : "danger"}>
                        {campus.isActive ? "Active" : "Disabled"}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </DataTable>
            </div>

            <div>
              <Panel className="p-5">
                <h3 className="text-sm font-bold text-[#0A0A0A] mb-3">Add Location / Hub</h3>
                <LocationForm />
              </Panel>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}