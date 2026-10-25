import { getCurrentAccount } from "@/lib/auth";
import { redirect } from "next/navigation";
import { orm } from "@/lib/db";
import { BookingFlow } from "@/components/passenger/booking-flow";

export const dynamic = "force-dynamic";

interface SearchParams {
  passengers?: string;
  step?: string;
}

export default async function BookTripPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const account = await getCurrentAccount();
  if (!account) {
    redirect("/login");
  }

  const { id: tripId } = await params;
  const search = await searchParams;

  // Fetch trip details
  const trip = await orm.Trip.where({ id: tripId, status: "PUBLISHED" })
    .include("route", (r) =>
      r.include("originCampus").include("destination")
    )
    .include("vehicle")
    .first();

  if (!trip) {
    redirect("/trips");
  }

  const passengerCount = parseInt(search.passengers || "1", 10);
  const currentStep = search.step || "confirm";

  // Check availability
  const availableSeats = trip.seatCapacity - trip.seatsReserved;
  if (availableSeats < passengerCount) {
    redirect(`/trips?error=insufficient-seats`);
  }

  return (
    <div className="max-w-4xl mx-auto">
      <BookingFlow
        trip={trip}
        account={account}
        initialPassengerCount={passengerCount}
        currentStep={currentStep}
      />
    </div>
  );
}
