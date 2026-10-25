import { SessionAccount } from "@/lib/auth";
import { TransportSearch } from "./transport-search";
import { UpcomingTrips } from "./upcoming-trips";
import { ActionRequired } from "./action-required";
import { FullBrandLogo } from "@/components/brand-logo";
import Link from "next/link";

interface RouteItem {
  id: string;
  name: string;
  originCampus: { id: string; name: string; code?: string };
  destination: { id: string; name: string; code?: string };
}

interface Option {
  id: string;
  name: string;
  code?: string;
}

export function PassengerHome({
  account,
  routes = [],
  campuses = [],
  destinations = [],
}: {
  account: SessionAccount | null;
  routes?: RouteItem[];
  campuses?: Option[];
  destinations?: Option[];
}) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <FullBrandLogo className="h-auto w-full max-w-[264px]" />

      {/* Search Hero Area */}
      <div className="space-y-2 text-left">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#102A43]">
          Find transport
        </h1>
      </div>

      {/* Main Transport Search */}
      <TransportSearch
        routes={routes}
        campuses={campuses}
        destinations={destinations}
      />

      {/* Contextual Information */}
      {account ? (
        <div className="space-y-6 pt-2">
          {/* Action Required Bookings */}
          <ActionRequired accountId={account.id} />

          {/* Upcoming Confirmed Trip */}
          <UpcomingTrips accountId={account.id} />
        </div>
      ) : (
        <div className="border border-[#E3E8E5] bg-white rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div>
            <div className="text-sm font-bold text-[#171717]">
              Already have a ticket or booking?
            </div>
            <div className="text-xs text-[#66706A] mt-0.5">
              Sign in with your traveler account to access your digital tickets and manage bookings.
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href="/login"
              className="text-xs font-bold px-3 py-2 rounded-lg bg-brand-green text-white hover:bg-[#066044] transition-colors shadow-xs"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="text-xs font-semibold px-3 py-2 rounded-lg border border-[#E3E8E5] text-[#171717] hover:bg-[#F3F6F4] transition-colors"
            >
              Register
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
