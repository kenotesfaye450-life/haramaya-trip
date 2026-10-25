import { getCurrentAccount } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BookingsList } from "@/components/passenger/bookings-list";

export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  const account = await getCurrentAccount();
  if (!account) {
    redirect("/login");
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-[#0A0A0A] mb-6">My Bookings</h1>
      <BookingsList accountId={account.id} />
    </div>
  );
}
