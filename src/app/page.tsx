import { getCurrentAccount } from "@/lib/auth";
import { orm } from "@/lib/db";
import { redirect } from "next/navigation";
import { PassengerHome } from "@/components/passenger/home";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const account = await getCurrentAccount();

  // Redirect admin/staff to their operational consoles
  if (account?.role === "ADMIN") {
    redirect("/admin");
  }
  if (account?.role === "STAFF") {
    redirect("/staff");
  }

  const [routes, campuses, destinations] = await Promise.all([
    orm.Route.where({ isActive: true })
      .include("originCampus")
      .include("destination")
      .orderBy((r) => r.name.asc())
      .all(),
    orm.Campus.where({ isActive: true }).orderBy((c) => c.name.asc()).all(),
    orm.Destination.where({ isActive: true }).orderBy((d) => d.name.asc()).all(),
  ]);

  return (
    <PassengerHome
      account={account}
      routes={routes}
      campuses={campuses}
      destinations={destinations}
    />
  );
}