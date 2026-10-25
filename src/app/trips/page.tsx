import { getCurrentAccount } from "@/lib/auth";
import { TripResults } from "@/components/passenger/trip-results";

export const dynamic = "force-dynamic";

interface SearchParams {
  from?: string;
  to?: string;
  date?: string;
  passengers?: string;
}

export default async function TripsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const account = await getCurrentAccount();
  const params = await searchParams;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <TripResults
        from={params.from}
        to={params.to}
        date={params.date}
        passengers={parseInt(params.passengers || "1", 10)}
        isAuthenticated={!!account}
      />
    </div>
  );
}
