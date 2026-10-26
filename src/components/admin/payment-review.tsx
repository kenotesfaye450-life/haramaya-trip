import { orm } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { PaymentApprovalActions } from "./payment-approval-actions";

function latestProof(
  proofs: Array<{ storageKey: string; createdAt: string | Date }> | undefined,
) {
  return proofs?.reduce((latest, proof) =>
    new Date(proof.createdAt).getTime() > new Date(latest.createdAt).getTime()
      ? proof
      : latest,
  );
}

function proofHref(storageKey: string) {
  return `/api/proofs/${storageKey.split("/").map(encodeURIComponent).join("/")}`;
}

export async function PaymentReview() {
  const pendingBookings = await orm.Booking.where({
    status: "PENDING_REVIEW",
  })
    .include("trip", (t) =>
      t.include("route", (r) =>
        r.include("originLocation").include("destinationLocation")
      )
    )
    .include("account")
    .include("proofs")
    .orderBy((b) => b.createdAt.asc())
    .all();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[#E3E8E5]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0A0A0A]">
            Payment Verification Queue
          </h1>
          <p className="text-xs text-[#66706A] mt-0.5">
            Verify bank transfer receipts uploaded by students before releasing boarding passes.
          </p>
        </div>
        <div>
          <Badge variant={pendingBookings.length > 0 ? "pending" : "neutral"}>
            {pendingBookings.length} {pendingBookings.length === 1 ? "proof pending" : "proofs pending"}
          </Badge>
        </div>
      </div>

      {pendingBookings.length === 0 ? (
        <div className="bg-white border border-[#E3E8E5] rounded-xl p-12 text-center space-y-2 shadow-xs">
          <div className="w-10 h-10 mx-auto rounded-full bg-[#ECFDF5] text-brand-green flex items-center justify-center font-bold">
            ✓
          </div>
          <div className="text-sm font-bold text-[#0A0A0A]">
            All Payments Reviewed
          </div>
          <p className="text-xs text-[#66706A] max-w-sm mx-auto">
            There are currently no passenger payment receipts awaiting review.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-[#E3E8E5] rounded-xl overflow-hidden shadow-xs">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAF9] border-b border-[#E3E8E5] text-[#66706A] font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Traveler</th>
                  <th className="px-4 py-3">Route & Departure</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Submitted Receipt</th>
                  <th className="px-4 py-3 text-right">Verification Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E8E5]/70">
                {pendingBookings.map((booking) => {
                  const trip = booking.trip;
                  const route = trip?.route;
                  const proof = latestProof(booking.proofs);
                  const totalAmount = (trip?.farePerSeat || 0) * booking.partySize;
                  const dept = trip ? new Date(trip.departureAt) : null;

                  return (
                    <tr key={booking.id} className="hover:bg-[#F8FAF9]/80 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-[#0A0A0A]">
                        {booking.reference}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[#171717]">
                          {booking.account?.fullName || "Student"}
                        </div>
                        <div className="text-[11px] text-[#66706A] font-mono">
                          {booking.account?.phone || booking.account?.email || ""}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[#171717] flex items-center gap-1.5">
                          <span>{route?.originLocation?.name || "Campus"}</span>
                          <span className="text-brand-green">→</span>
                          <span>{route?.destinationLocation?.name || "Destination"}</span>
                        </div>
                        {dept && (
                          <div className="text-[11px] text-[#66706A] font-mono mt-0.5">
                            {dept.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · {dept.toLocaleDateString([], { month: "short", day: "numeric" })}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono font-bold text-[#0A0A0A]">
                          ETB {totalAmount}
                        </div>
                        <div className="text-[11px] text-[#66706A]">
                          {booking.partySize} {booking.partySize === 1 ? "seat" : "seats"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {proof ? (
                          <a
                            href={proofHref(proof.storageKey)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-semibold text-xs text-brand-green underline hover:text-[#066044] transition-colors"
                          >
                            <span>Open receipt file</span>
                            <span className="text-[10px]">↗</span>
                          </a>
                        ) : (
                          <span className="text-[#9CA3AF]">No file</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end">
                          <PaymentApprovalActions
                            bookingId={booking.id}
                            bookingReference={booking.reference}
                            amount={totalAmount}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Structured List */}
          <div className="lg:hidden divide-y divide-[#E3E8E5]">
            {pendingBookings.map((booking) => {
              const trip = booking.trip;
              const route = trip?.route;
              const proof = latestProof(booking.proofs);
              const totalAmount = (trip?.farePerSeat || 0) * booking.partySize;

              return (
                <div key={booking.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-sm text-[#0A0A0A]">
                      {booking.reference}
                    </span>
                    <span className="font-mono font-bold text-[#0A0A0A]">
                      ETB {totalAmount}
                    </span>
                  </div>

                  <div className="text-xs text-[#171717]">
                    <div className="font-semibold">{booking.account?.fullName || "Student"}</div>
                    <div className="text-[#66706A]">
                      {route?.originLocation?.name || "Campus"} → {route?.destinationLocation?.name || "Destination"} · {booking.partySize} seats
                    </div>
                  </div>

                  {proof && (
                    <div>
                      <a
                        href={proofHref(proof.storageKey)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-brand-green font-semibold underline"
                      >
                        Open submitted receipt file ↗
                      </a>
                    </div>
                  )}

                  <div className="pt-1 border-t border-[#E3E8E5]">
                    <PaymentApprovalActions
                      bookingId={booking.id}
                      bookingReference={booking.reference}
                      amount={totalAmount}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}