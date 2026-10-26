import { getCurrentAccount } from "@/lib/auth";
import { redirect } from "next/navigation";
import { orm } from "@/lib/db";
import { BookingFlow } from "@/components/passenger/booking-flow";
import { authPageHref } from "@/lib/return-to";

export const dynamic = "force-dynamic";

interface SearchParams {
  passengers?: string;
  step?: string;
}

const bookingSteps = new Set(["confirm", "details", "review"]);

export default async function BookTripPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { id: tripId } = await params;
  const search = await searchParams;
  const requestedCount = Number.parseInt(search.passengers || "1", 10);
  const passengerCount =
    Number.isInteger(requestedCount) && requestedCount >= 1 && requestedCount <= 60
      ? requestedCount
      : 1;
  const currentStep = bookingSteps.has(search.step || "")
    ? search.step!
    : "confirm";
  const returnParams = new URLSearchParams({
    passengers: String(passengerCount),
    step: currentStep,
  });
  const returnTo =
    "/trips/" + encodeURIComponent(tripId) + "/book?" + returnParams.toString();

  const account = await getCurrentAccount();
  if (!account) {
    redirect(authPageHref("login", returnTo));
  }

  const trip = await orm.Trip.where({ id: tripId, status: "PUBLISHED" })
    .include("route", (r) =>
      r.include("originLocation").include("destinationLocation")
    )
    .include("vehicle")
    .first();

  if (!trip) {
    redirect("/trips");
  }

  const availableSeats = trip.seatCapacity - trip.seatsReserved;
  if (availableSeats < passengerCount) {
    redirect("/trips?error=insufficient-seats");
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
