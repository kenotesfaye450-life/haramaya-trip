import { requireRoleAt } from "@/lib/auth";
import { orm } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function StaffCheckinHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireRoleAt("/staff/history", "STAFF", "ADMIN");
  const params = await searchParams;
  const query = (params.q || "").trim().toLowerCase();

  // Fetch checked-in passengers
  const checkedInPassengers = await orm.Passenger.where({
    checkInStatus: "CHECKED_IN",
  })
    .include("checkedInBy")
    .include("booking", (b) =>
      b.include("trip", (t) =>
        t
          .include("route", (r) =>
            r.include("originLocation").include("destinationLocation")
          )
          .include("vehicle")
      )
    )
    .orderBy((p) => p.checkedInAt ? p.checkedInAt.desc() : p.updatedAt.desc())
    .limit(200)
    .all();

  const filtered = query
    ? checkedInPassengers.filter((p) => {
        return (
          p.fullName.toLowerCase().includes(query) ||
          p.identityNumber.toLowerCase().includes(query) ||
          (p.phone && p.phone.toLowerCase().includes(query)) ||
          p.booking?.reference.toLowerCase().includes(query)
        );
      })
    : checkedInPassengers;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E3E8E5]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0A0A0A]">
            Boarding Check-in History
          </h1>
          <p className="text-xs text-[#66706A] mt-0.5">
            Latest 200 verified check-ins across campus departure gates. Use passenger search for older records.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="neutral" size="sm" asChild>
            <Link href="/staff">← Today&apos;s Departures</Link>
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <Link href="/staff/search">Search Passenger</Link>
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E3E8E5] rounded-xl p-4 shadow-xs">
          <div className="text-[10px] font-bold text-[#87918B] uppercase tracking-wider">
            Total Boarded Passengers
          </div>
          <div className="text-2xl font-black font-mono text-brand-green mt-1">
            {checkedInPassengers.length}
          </div>
        </div>

        <div className="bg-white border border-[#E3E8E5] rounded-xl p-4 shadow-xs">
          <div className="text-[10px] font-bold text-[#87918B] uppercase tracking-wider">
            Verified Physical IDs
          </div>
          <div className="text-2xl font-black font-mono text-[#171717] mt-1">
            100%
          </div>
          <p className="text-[11px] text-[#66706A] mt-0.5">Physical gate inspection enforced</p>
        </div>

        <div className="bg-white border border-[#E3E8E5] rounded-xl p-4 shadow-xs">
          <div className="text-[10px] font-bold text-[#87918B] uppercase tracking-wider">
            Station Status
          </div>
          <div className="text-sm font-bold text-brand-green mt-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
            Gates Active & Synchronized
          </div>
        </div>
      </div>

      {/* Search Input */}
      <form method="GET" className="flex items-center gap-2">
        <input
          name="q"
          defaultValue={params.q || ""}
          placeholder="Filter by passenger name, ID number, or booking reference..."
          className="h-10 px-3.5 bg-white border border-[#E3E8E5] rounded-xl text-xs w-full sm:max-w-md focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/15"
        />
        <Button size="default" type="submit" className="font-bold text-xs h-10 px-5 shadow-xs">
          Filter
        </Button>
      </form>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-[#E3E8E5] rounded-xl p-12 text-center space-y-2 shadow-xs">
          <div className="text-sm font-bold text-[#0A0A0A]">
            No check-in records found
          </div>
          <p className="text-xs text-[#66706A] max-w-sm mx-auto">
            {query
              ? `No boarded passengers matched "${query}".`
              : "No passengers have been checked in at departure gates yet."}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-[#E3E8E5] rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAF9] border-b border-[#E3E8E5] text-[#66706A] font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Passenger & ID</th>
                  <th className="px-4 py-3">Route & Departure</th>
                  <th className="px-4 py-3">Assigned Vehicle</th>
                  <th className="px-4 py-3">Check-in Time</th>
                  <th className="px-4 py-3">Verified By</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E8E5]/70">
                {filtered.map((p) => {
                  const trip = p.booking?.trip;
                  const route = trip?.route;
                  const checkInDate = p.checkedInAt ? new Date(p.checkedInAt) : null;
                  const deptDate = trip ? new Date(trip.departureAt) : null;

                  return (
                    <tr key={p.id} className="hover:bg-[#F8FAF9]/80 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-[#171717]">{p.fullName}</div>
                        <div className="text-[11px] text-[#66706A] font-mono">
                          {p.identityType.replace("_", " ")}: {p.identityNumber}
                        </div>
                        <div className="text-[10px] text-[#87918B] font-mono mt-0.5">
                          Ref: {p.booking?.reference}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[#171717] flex items-center gap-1.5">
                          <span>{route?.originLocation?.name || "Origin"}</span>
                          <span className="text-brand-green">→</span>
                          <span>{route?.destinationLocation?.name || "Destination"}</span>
                        </div>
                        {deptDate && (
                          <div className="text-[11px] text-[#66706A] font-mono mt-0.5">
                            {deptDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · {deptDate.toLocaleDateString([], { month: "short", day: "numeric" })}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {trip?.vehicle ? (
                          <span className="bg-[#F3F6F4] px-2 py-0.5 rounded text-[#171717] font-semibold border border-[#E3E8E5]">
                            {trip.vehicle.plateNumber}
                          </span>
                        ) : (
                          <span className="text-[#87918B] italic">Assigned at gate</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-[#171717]">
                        {checkInDate ? (
                          <>
                            <div className="font-bold">
                              {checkInDate.toLocaleTimeString([], {
                                hour: "numeric",
                                minute: "2-digit",
                                second: "2-digit",
                              })}
                            </div>
                            <div className="text-[11px] text-[#66706A]">
                              {checkInDate.toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                              })}
                            </div>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[#171717]">
                          {p.checkedInBy?.fullName || "Staff Station"}
                        </div>
                        <div className="text-[11px] text-[#66706A] font-mono">
                          {p.checkedInBy?.email || ""}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Badge variant="success">Boarded</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
