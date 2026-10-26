import { VehicleForm } from "@/components/vehicle-form";
import { DataTable, EmptyState, PageHeader, Panel, StatusBadge } from "@/components/ui";
import { requireRoleAt } from "@/lib/auth";
import { orm } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminVehiclesPage({
  searchParams,
}: {
  searchParams: Promise<{ editId?: string }>;
}) {
  await requireRoleAt("/admin/vehicles", "ADMIN");
  const { editId } = await searchParams;

  const now = new Date();
  const vehicles = await orm.Vehicle.include("trips", (t) =>
    t.include("route", (r) => r.include("originLocation").include("destinationLocation"))
  )
    .orderBy((v) => v.name.asc())
    .all();

  const vehicleToEdit = editId ? vehicles.find((v) => v.id === editId) : null;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Fleet Vehicle Management"
        description="University buses, coasters, and minibuses with verified seat capacities. Manage operational status, track trip assignments, and prevent scheduling conflicts."
      />

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold tracking-tight text-[#0A0A0A]">
              Registered Fleet ({vehicles.length})
            </h2>
          </div>

          {vehicles.length === 0 ? (
            <EmptyState title="No vehicles registered" body="Add transport vehicles using the form on the right." />
          ) : (
            <DataTable headers={["Vehicle Name", "Plate Number", "Capacity", "Operational Status", "Upcoming Assignment", "Action"]}>
              {vehicles.map((v) => {
                const upcomingTrips = (v.trips || []).filter(
                  (t) => t.status === "PUBLISHED" && new Date(t.departureAt) >= now
                );
                const nextTrip = upcomingTrips.sort(
                  (a, b) => new Date(a.departureAt).getTime() - new Date(b.departureAt).getTime()
                )[0];

                return (
                  <tr key={v.id} className="hover:bg-[#F8FAF9]/80 transition-colors">
                    <td className="px-4 py-3 font-semibold text-[#0A0A0A]">{v.name}</td>
                    <td className="px-4 py-3 font-mono text-xs font-bold text-[#171717]">{v.plateNumber}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className="font-bold font-mono text-[#0A0A0A]">{v.seatCapacity}</span> seats
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={v.isActive ? "success" : "danger"}>
                        {v.isActive ? "In Service" : "Maintenance"}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {!v.isActive ? (
                        <span className="text-[#DC2626] font-medium">Out of Service</span>
                      ) : nextTrip ? (
                        <div>
                          <div className="font-semibold text-[#171717]">
                            {nextTrip.route?.name || "Assigned Trip"}
                          </div>
                          <div className="text-[11px] text-[#66706A] font-mono">
                            {new Date(nextTrip.departureAt).toLocaleDateString([], { month: "short", day: "numeric" })}{" "}
                            · {new Date(nextTrip.departureAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                          </div>
                        </div>
                      ) : (
                        <span className="text-brand-green font-semibold bg-[#ECFDF5] px-2 py-0.5 rounded border border-[#A7F3D0]">
                          Available
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/vehicles?editId=${v.id}`}
                        className="text-xs font-semibold text-brand-green hover:text-[#066044] underline"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </DataTable>
          )}
        </div>

        <div>
          <Panel className="p-6">
            <h3 className="text-sm font-bold text-[#0A0A0A] mb-3">
              {vehicleToEdit ? `Edit: ${vehicleToEdit.name}` : "Add Fleet Vehicle"}
            </h3>
            <VehicleForm
              vehicleToEdit={
                vehicleToEdit
                  ? {
                      id: vehicleToEdit.id,
                      name: vehicleToEdit.name,
                      plateNumber: vehicleToEdit.plateNumber,
                      seatCapacity: vehicleToEdit.seatCapacity,
                      isActive: vehicleToEdit.isActive,
                    }
                  : undefined
              }
            />
          </Panel>
        </div>
      </div>
    </div>
  );
}
