import { DataTable, EmptyState, PageHeader, Panel, StatusBadge } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { BOOKING_STATUS_LABELS, CHECKIN_LABELS, IDENTITY_LABELS } from "@/lib/constants";
import { orm } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import Link from "next/link";
import { or } from "@prisma/orm-postgres/orm-client";

export const dynamic = "force-dynamic";

export default async function StaffSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireRole("STAFF", "ADMIN");
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  type StaffSearchPassenger = {
    id: string;
    fullName: string;
    identityNumber: string;
    identityType: string;
    phone?: string | null;
    checkInStatus: string;
    ticket?: { publicCode: string; id: string } | null;
    booking?: {
      id: string;
      reference: string;
      trip?: {
        route?: { name?: string | null } | null;
        departureAt?: string | null;
      } | null;
    } | null;
    bookingId?: string | null;
  };

  type StaffSearchBooking = {
    id: string;
    reference: string;
    partySize: number;
    status: string;
    createdAt: string;
    account?: { fullName?: string | null; email?: string | null } | null;
    trip?: {
      route?: { name?: string | null } | null;
      departureAt?: string | null;
    } | null;
  };

  let matchedPassengers: StaffSearchPassenger[] = [];
  let matchedBookings: StaffSearchBooking[] = [];

  if (query) {
    const pattern = `%${query.replace(/[\\%_]/g, "\\$&")}%`;
    const [passengers, ticketMatches, bookings] = await Promise.all([
      orm.Passenger.where((p) =>
        or(p.fullName.ilike(pattern), p.identityNumber.ilike(pattern), p.phone.ilike(pattern)),
      )
        .include("booking", (b) =>
          b.include("trip", (t) =>
            t.include("route", (r) => r.include("originCampus").include("destination")),
          ),
        )
        .include("ticket")
        .orderBy((p) => p.fullName.asc())
        .limit(100)
        .all(),
      orm.Ticket.where((ticket) => ticket.publicCode.ilike(pattern))
        .include("passenger", (p) =>
          p.include("booking", (b) =>
            b.include("trip", (t) =>
              t.include("route", (r) => r.include("originCampus").include("destination")),
            ),
          ),
        )
        .limit(100)
        .all(),
      orm.Booking.where((b) => b.reference.ilike(pattern))
        .include("trip", (t) =>
          t.include("route", (r) => r.include("originCampus").include("destination")),
        )
        .include("account")
        .include("passengers")
        .orderBy((b) => b.createdAt.desc())
        .limit(100)
        .all(),
    ]);

    const byId = new Map(passengers.map((passenger) => [passenger.id, passenger]));
    for (const ticket of ticketMatches) {
      const passenger = ticket.passenger;
      if (!passenger) continue;
      byId.set(passenger.id, {
        ...passenger,
        ticket,
      });
    }
    matchedPassengers = [...byId.values()];
    matchedBookings = bookings;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Search Bookings & Passengers"
        description="Search by passenger full name, official identity document number, backup ticket code, or booking reference."
        actions={
          <Link
            href="/staff"
            className="border border-[#E3E8E5] bg-white px-3 py-2 text-xs font-semibold text-[#171717] hover:bg-[#F3F6F4] rounded-lg transition-colors shadow-xs"
          >
            ← Back to Departure Console
          </Link>
        }
      />

      <Panel className="p-6">
        <form method="GET" className="flex gap-3">
          <input
            name="q"
            defaultValue={query}
            placeholder="Search by passenger name, ID number, phone, ticket code, or HU-XXXXXX..."
            className="h-10 flex-1 border border-[#E3E8E5] bg-white px-3.5 text-sm rounded-lg outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/15 transition-colors"
            autoFocus
          />
          <button
            type="submit"
            className="bg-brand-green text-white px-5 py-2 text-sm font-semibold hover:bg-[#066044] rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            Search
          </button>
        </form>
      </Panel>

      {query ? (
        <div className="space-y-8">
          {/* Passenger Search Results */}
          <div className="space-y-3">
            <h2 className="text-base font-semibold tracking-tight text-zinc-950">
              Matching Passengers ({matchedPassengers.length})
            </h2>

            {matchedPassengers.length === 0 ? (
              <EmptyState
                title="No passenger records found"
                body={`No passengers matched the search term "${query}".`}
              />
            ) : (
              <DataTable headers={["Passenger Name", "Document Type", "ID Number", "Trip Route", "Departure", "Booking Ref", "Check-in", "Action"]}>
                {matchedPassengers.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-medium text-zinc-950">
                      {p.fullName}
                      {p.phone ? <span className="block text-xs text-zinc-500">{p.phone}</span> : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-600">
                      {IDENTITY_LABELS[p.identityType as keyof typeof IDENTITY_LABELS] ?? p.identityType}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-bold text-zinc-950">
                      {p.identityNumber}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {p.booking?.trip?.route?.name ?? "Trip"}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-700">
                      {formatDateTime(p.booking?.trip?.departureAt)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      <Link href={`/bookings/${p.bookingId}`} className="underline">
                        {p.booking?.reference}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        tone={
                          p.checkInStatus === "CHECKED_IN"
                            ? "success"
                            : p.checkInStatus === "NO_SHOW"
                            ? "danger"
                            : "neutral"
                        }
                      >
                        {CHECKIN_LABELS[p.checkInStatus as keyof typeof CHECKIN_LABELS] ??
                          p.checkInStatus}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {p.ticket ? (
                        <Link
                          href={`/staff?ticketId=${p.ticket.id}`}
                          className="bg-brand-green text-white px-3 py-1.5 text-xs font-semibold hover:bg-[#066044] rounded-lg transition-colors inline-block shadow-xs"
                        >
                          Verify & Check In
                        </Link>
                      ) : (
                        <span className="text-xs text-[#66706A]">No ticket</span>
                      )}
                    </td>
                  </tr>
                ))}
              </DataTable>
            )}
          </div>

          {/* Booking Reference Results */}
          <div className="space-y-3">
            <h2 className="text-base font-semibold tracking-tight text-zinc-950">
              Matching Bookings ({matchedBookings.length})
            </h2>

            {matchedBookings.length === 0 ? (
              <p className="text-xs text-zinc-500">No matching booking references.</p>
            ) : (
              <DataTable headers={["Reference", "Booked By", "Route", "Passengers", "Status", "Created"]}>
                {matchedBookings.map((b) => (
                  <tr key={b.id}>
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/bookings/${b.id}`} className="underline">
                        {b.reference}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <p className="font-medium text-zinc-950">{b.account?.fullName}</p>
                      <p className="text-xs text-zinc-500">{b.account?.email}</p>
                    </td>
                    <td className="px-4 py-3 text-xs">{b.trip?.route?.name}</td>
                    <td className="px-4 py-3 text-sm font-semibold">{b.partySize}</td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={b.status === "CONFIRMED" ? "success" : "neutral"}>
                        {BOOKING_STATUS_LABELS[b.status] ?? b.status}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{formatDateTime(b.createdAt)}</td>
                  </tr>
                ))}
              </DataTable>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
