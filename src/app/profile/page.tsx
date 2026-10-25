import { getCurrentAccount } from "@/lib/auth";
import { redirect } from "next/navigation";
import { orm } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/lib/actions/auth";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const account = await getCurrentAccount();
  if (!account) {
    redirect("/login?next=/profile");
  }

  const [bookings, demandCount] = await Promise.all([
    orm.Booking.where({ accountId: account.id }).all(),
    orm.DemandRequest.where({ accountId: account.id }).all(),
  ]);

  const confirmedBookings = bookings.filter((b) => b.status === "CONFIRMED");
  const pendingBookings = bookings.filter(
    (b) => b.status === "PENDING_PAYMENT" || b.status === "PENDING_REVIEW"
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-[#E3E8E5]">
        <h1 className="text-2xl font-bold tracking-tight text-[#0A0A0A]">
          Profile
        </h1>
      </div>

      {/* Account Card */}
      <div className="bg-white border border-[#E3E8E5] rounded-xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#F3F6F4]">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] text-brand-green font-black text-xl flex items-center justify-center shadow-xs">
              {account.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#0A0A0A]">
                  {account.fullName}
                </h2>
                <Badge variant={account.role === "ADMIN" ? "neutral" : "success"}>
                  {account.role}
                </Badge>
              </div>
              <p className="text-xs text-[#66706A] font-mono mt-0.5">
                {account.email}
              </p>
            </div>
          </div>

          <form action={logoutAction}>
            <Button variant="secondary" size="sm" type="submit">
              Sign Out
            </Button>
          </form>
        </div>

        {account.phone && (
          <div className="text-xs text-[#52677D]">
            <span className="font-semibold text-[#344B63]">Phone</span>
            <span className="ml-2 font-mono">{account.phone}</span>
          </div>
        )}
      </div>

      {/* Transit Activity Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E3E8E5] rounded-xl p-5 shadow-xs">
          <div className="text-[10px] font-bold text-[#87918B] uppercase tracking-wider">
            Confirmed Trips
          </div>
          <div className="text-2xl font-black font-mono text-brand-green mt-1">
            {confirmedBookings.length}
          </div>
        </div>

        <div className="bg-white border border-[#E3E8E5] rounded-xl p-5 shadow-xs">
          <div className="text-[10px] font-bold text-[#87918B] uppercase tracking-wider">
            Pending Bookings
          </div>
          <div className="text-2xl font-black font-mono text-[#2563EB] mt-1">
            {pendingBookings.length}
          </div>
        </div>

        <div className="bg-white border border-[#E3E8E5] rounded-xl p-5 shadow-xs">
          <div className="text-[10px] font-bold text-[#87918B] uppercase tracking-wider">
            Travel Requests
          </div>
          <div className="text-2xl font-black font-mono text-[#171717] mt-1">
            {demandCount.length}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button size="default" asChild className="font-bold shadow-xs">
          <Link href="/bookings">View My Trips →</Link>
        </Button>
        <Button variant="secondary" size="default" asChild>
          <Link href="/demand">Travel requests</Link>
        </Button>
        <Button variant="secondary" size="default" asChild>
          <Link href="/help">Help</Link>
        </Button>
      </div>
    </div>
  );
}
