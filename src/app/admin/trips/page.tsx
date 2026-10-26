import { TripsManagement } from "@/components/admin/trips-management";
import { requireRoleAt } from "@/lib/auth";
import { orm } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminTripsPage({
  searchParams,
}: {
  searchParams: Promise<{
    editId?: string;
    create?: string;
    fromLocationId?: string;
    toLocationId?: string;
    departureDate?: string;
  }>;
}) {
  await requireRoleAt("/admin/trips", "ADMIN");
  const params = await searchParams;

  const [allTrips, locations, purposes, vehicles, events] = await Promise.all([
    orm.Trip.include("originLocation")
      .include("destinationLocation")
      .include("purpose")
      .include("vehicle")
      .orderBy((trip) => trip.departureAt.asc())
      .all(),
    orm.Location.where({ isActive: true }).orderBy((location) => location.name.asc()).all(),
    orm.TripPurpose.where({ isActive: true }).orderBy((purpose) => purpose.name.asc()).all(),
    orm.Vehicle.where({ isActive: true }).orderBy((vehicle) => vehicle.name.asc()).all(),
    orm.TravelEvent.where({ isActive: true }).orderBy((event) => event.name.asc()).all(),
  ]);

  const tripToEdit = params.editId ? allTrips.find((trip) => trip.id === params.editId) : null;
  return (
    <TripsManagement
      allTrips={allTrips}
      locations={locations}
      purposes={purposes}
      vehicles={vehicles}
      events={events}
      tripToEdit={tripToEdit}
      isCreating={params.create === "true" || !!params.editId}
      initialFromLocationId={params.fromLocationId}
      initialToLocationId={params.toLocationId}
      initialDepartureDate={params.departureDate}
    />
  );
}
