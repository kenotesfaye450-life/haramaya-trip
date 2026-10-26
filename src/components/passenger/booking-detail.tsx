import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { PaymentInstructions } from "./payment-instructions";
import { BookingProgress } from "./booking-progress";
import { CancelBookingButton } from "@/components/cancel-booking-button";
import Link from "next/link";

interface Booking {
  id: string;
  reference: string;
  partySize: number;
  status: string;
  paymentStatus: string;
  rejectionReason: string | null;
  createdAt: Date | string;
  trip?: {
    departureAt: Date | string;
    farePerSeat: number;
    route?: {
      originLocation?: { name: string } | null;
      destinationLocation?: { name: string } | null;
    } | null;
  } | null;
  passengers?: Array<{ fullName: string; identityType?: string; identityNumber?: string }>;
  proofs?: Array<{ createdAt: Date | string }>;
}

interface BookingDetailProps {
  booking: Booking;
  justCreated?: boolean;
}

export function BookingDetail({ booking, justCreated }: BookingDetailProps) {
  const trip = booking.trip;
  const route = trip?.route;
  const totalFare = (trip?.farePerSeat || 0) * booking.partySize;
  const hasProof = (booking.proofs?.length || 0) > 0;

  const departureDate = trip ? new Date(trip.departureAt) : null;

  const isConfirmed = booking.paymentStatus === "APPROVED";
  const isPendingReview = booking.status === "PENDING_REVIEW";
  const isRejected = booking.paymentStatus === "REJECTED";
  const needsPayment = booking.paymentStatus === "UNPAID" && !hasProof;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {justCreated && (
        <Alert variant="info" title="Booking Reservation Created">
          Transfer the fare amount and submit your bank receipt below to confirm your seats.
        </Alert>
      )}

      {/* Main Header Card */}
      <div className="bg-white border border-[#E3E8E5] rounded-xl p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-[#F3F6F4] pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#87918B] uppercase font-bold tracking-wider">Booking Ref</span>
            <span className="font-mono text-sm font-bold text-[#0A0A0A]">
              {booking.reference}
            </span>
          </div>
          <div>
            {isConfirmed && <Badge variant="success">Confirmed</Badge>}
            {isPendingReview && <Badge variant="pending">Under Review</Badge>}
            {isRejected && <Badge variant="error">Rejected</Badge>}
            {needsPayment && <Badge variant="warning">Action Required</Badge>}
          </div>
        </div>

        <div>
          {/* Route Motif */}
          <h1 className="text-2xl font-extrabold tracking-tight text-[#0A0A0A] flex items-center gap-2">
            <span>{route?.originLocation?.name || "Campus"}</span>
            <span className="text-brand-green font-normal">──→</span>
            <span>{route?.destinationLocation?.name || "Destination"}</span>
          </h1>
          {departureDate && (
            <div className="text-xs text-[#66706A] font-medium mt-1.5 flex items-center gap-2">
              <span>Departure:</span>
              <span className="font-mono font-bold text-[#171717] tabular-nums">
                {departureDate.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })}
              </span>
              <span>·</span>
              <span>
                {departureDate.toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          )}
        </div>
      </div>

      <BookingProgress current={isConfirmed ? "Ticket" : "Payment"} />

      {/* Pending Review State: Blue localized indicator */}
      {isPendingReview && (
        <div className="bg-white border border-[#BFDBFE] border-l-4 border-l-[#2563EB] rounded-xl p-5 space-y-2 shadow-xs">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center font-bold text-xs">
              ℹ
            </div>
            <h2 className="text-base font-bold text-[#1E40AF]">
              Payment Under Review
            </h2>
          </div>
          <p className="text-xs md:text-sm text-[#1E3A8A] leading-relaxed">
            Your payment proof has been submitted. Your booking is not confirmed yet. University dispatch verifies receipts during station hours.
          </p>
          <div className="text-[11px] text-[#60A5FA] font-mono pt-1">
            Booking {booking.reference} · {booking.partySize} {booking.partySize === 1 ? "seat" : "seats"} reserved
          </div>
        </div>
      )}

      {/* Rejected State: Red localized indicator */}
      {isRejected && (
        <div className="bg-white border border-[#FECACA] border-l-4 border-l-[#DC2626] rounded-xl p-5 space-y-3 shadow-xs">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center font-bold text-xs">
              ✕
            </div>
            <h2 className="text-base font-bold text-[#991B1B]">
              Payment Proof Rejected
            </h2>
          </div>
          <p className="text-xs md:text-sm text-[#7F1D1D] leading-relaxed">
            The submitted payment screenshot or receipt could not be verified.
          </p>
          {booking.rejectionReason && (
            <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-lg p-3 text-xs text-[#991B1B]">
              <span className="font-bold">Reason:</span> {booking.rejectionReason}
            </div>
          )}
          <p className="text-xs text-[#66706A]">
            Please review the requirements below and upload a clear receipt showing transaction reference.
          </p>
        </div>
      )}

      {/* Confirmed State: Green localized banner */}
      {isConfirmed && (
        <div className="bg-white border border-[#A7F3D0] border-l-4 border-l-brand-green rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs">
          <div className="space-y-1">
            <div className="text-base font-bold text-[#064E3B] flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#ECFDF5] text-brand-green flex items-center justify-center font-bold text-xs">
                ✓
              </span>
              <span>Booking Confirmed</span>
            </div>
            <p className="text-xs text-[#065F46]">
              Boarding pass is ready. Show your QR code at the campus departure gate.
            </p>
          </div>
          <Button size="default" asChild className="font-bold shadow-xs flex-shrink-0">
            <Link href={`/bookings/${booking.id}/ticket`}>
              Open Digital Ticket →
            </Link>
          </Button>
        </div>
      )}

      {/* Passengers Roster */}
      <div className="bg-white border border-[#E3E8E5] rounded-xl p-5 space-y-3 shadow-xs">
        <div className="text-xs font-bold text-brand-green uppercase tracking-wider border-b border-[#F3F6F4] pb-2">
          Passenger Roster ({booking.partySize})
        </div>
        <div className="divide-y divide-[#F3F6F4] text-xs">
          {booking.passengers?.map((p, i) => (
            <div key={i} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between">
              <div>
                <span className="font-bold text-[#171717]">
                  {i + 1}. {p.fullName}
                </span>
                {p.identityNumber && (
                  <span className="text-[#66706A] font-mono ml-2">
                    ({p.identityNumber})
                  </span>
                )}
              </div>
              <span className="text-[11px] text-[#87918B]">
                {isConfirmed ? "Confirmed Pass" : "Awaiting Verification"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Instructions / Proof Upload */}
      {(needsPayment || isRejected) && (
        <PaymentInstructions
          bookingReference={booking.reference}
          amount={totalFare}
          bookingId={booking.id}
        />
      )}

      {/* Back Link & Cancellation */}
      <div className="pt-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs text-[#66706A]">
        <Link href="/bookings" className="text-brand-green hover:text-[#066044] font-semibold underline">
          ← Back to My Trips
        </Link>
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {booking.status !== "CANCELLED" && (
            <CancelBookingButton bookingId={booking.id} />
          )}
          <span className="font-mono text-[#87918B]">
            Created {new Date(booking.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
}
