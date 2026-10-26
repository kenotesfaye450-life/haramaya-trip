import type { SessionAccount } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { FullBrandLogo } from "@/components/brand-logo";
import Link from "next/link";
import { ActionRequired } from "./action-required";
import { TransportSearch } from "./transport-search";
import { UpcomingTrips } from "./upcoming-trips";

interface Option {
  id: string;
  name: string;
  code?: string;
}

interface PassengerHomeProps {
  account: SessionAccount | null;
  locations: Option[];
  initialFrom?: string;
  initialTo?: string;
  initialDate?: string;
  initialPassengers?: string;
}

export function PassengerHome({
  account,
  locations,
  initialFrom = "",
  initialTo = "",
  initialDate = "",
  initialPassengers = "1",
}: PassengerHomeProps) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <FullBrandLogo className="h-auto w-full max-w-[264px]" />

      <div className="space-y-2 text-left">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#102A43]">
          Find transport
        </h1>
      </div>

      <TransportSearch
        locations={locations}
        initialFrom={initialFrom}
        initialTo={initialTo}
        initialDate={initialDate}
        initialPassengers={initialPassengers}
      />

      {account ? (
        <div className="space-y-6 pt-2">
          <ActionRequired accountId={account.id} />
          <UpcomingTrips accountId={account.id} />
        </div>
      ) : (
        <div className="border border-[#E3E8E5] bg-white rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div>
            <div className="text-sm font-bold text-[#171717]">
              Already have a ticket or booking?
            </div>
            <div className="mt-0.5 text-xs text-[#66706A]">
              Sign in with your traveler account to access your digital tickets and manage bookings.
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/register">Register</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
