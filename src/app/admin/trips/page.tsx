import { TripsManagement } from "@/components/admin/trips-management";
import { requireRole } from "@/lib/auth";
import { orm } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminTripsPage({
  searchParams,
}: {
  searchParams: Promise<{ editId?: string; create?: string }>;
}) {
  await requireRole("ADMIN");
  const { editId, create } = await searchParams;

  const [allTrips, routes, vehicles, events] = await Promise.all([
    orm.Trip.include("route", (r) =>
      r.include("originCampus").include("destination")
    )
      .include("vehicle")
      .orderBy((t) => t.departureAt.asc())
      .all(),
    orm.Route.where({ isActive: true }).orderBy((r) => r.name.asc()).all(),
    orm.Vehicle.where({ isActive: true }).orderBy((v) => v.name.asc()).all(),
    orm.TravelEvent.where({ isActive: true }).orderBy((e) => e.name.asc()).all(),
  ]);

  const tripToEdit = editId ? allTrips.find((t) => t.id === editId) : null;

  return (
    <TripsManagement
      allTrips={allTrips}
      routes={routes}
      vehicles={vehicles}
      events={events}
      tripToEdit={tripToEdit}
      isCreating={create === "true" || !!editId}
    />
  );
}