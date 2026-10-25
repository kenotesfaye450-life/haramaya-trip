import { getCurrentAccount } from "@/lib/auth";
import { redirect } from "next/navigation";
import { StaffDepartures } from "@/components/staff/staff-departures";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const account = await getCurrentAccount();
  if (!account || (account.role !== "STAFF" && account.role !== "ADMIN")) {
    redirect("/");
  }

  return (
    <div className="max-w-4xl mx-auto">
      <StaffDepartures />
    </div>
  );
}
