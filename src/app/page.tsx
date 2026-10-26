import { getCurrentAccount } from "@/lib/auth";
import { orm } from "@/lib/db";
import { redirect } from "next/navigation";
import { PassengerHome } from "@/components/passenger/home";

export const dynamic = "force-dynamic";

interface HomeSearchParams {
  from?: string;
  to?: string;
  date?: string;
  passengers?: string;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<HomeSearchParams>;
}) {
  const [account, search] = await Promise.all([
    getCurrentAccount(),
    searchParams,
  ]);

  if (account?.role === "ADMIN") {
    redirect("/admin");
  }
  if (account?.role === "STAFF") {
    redirect("/staff");
  }

  const locations = await orm.Location.where({ isActive: true })
    .orderBy((location) => location.name.asc())
    .all();

  const requestedPassengers = Number.parseInt(search.passengers || "1", 10);
  const initialPassengers =
    Number.isInteger(requestedPassengers) && requestedPassengers >= 1 && requestedPassengers <= 20
      ? String(requestedPassengers)
      : "1";

  return (
    <PassengerHome
      account={account}
      locations={locations}
      initialFrom={search.from || ""}
      initialTo={search.to || ""}
      initialDate={search.date || ""}
      initialPassengers={initialPassengers}
    />
  );
}
