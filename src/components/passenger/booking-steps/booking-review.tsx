"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import type { SessionAccount } from "@/lib/auth";
import type { Trip } from "../booking-flow";

interface PassengerData {
  fullName: string;
  phone: string;
  identityType: string;
  identityNumber: string;
  age?: string;
  sex?: string;
}

interface BookingReviewProps {
  trip: Trip;
  account?: SessionAccount;
  passengers: PassengerData[];
  onBack: () => void;
}

export function BookingReview({
  trip,
  passengers,
  onBack,
}: BookingReviewProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const totalFare = trip.farePerSeat * passengers.length;
  const departureDate = new Date(trip.departureAt);
  const dateStr = departureDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = departureDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const handleSubmit = async () => {
    if (!termsAccepted) {
      setError("Please confirm that all passengers carry physical identification.");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/bookings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId: trip.id,
          passengers: passengers.map((p) => ({
            fullName: p.fullName,
            phone: p.phone || null,
            identityType: p.identityType,
            identityNumber: p.identityNumber,
          })),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create booking");
      }

      const data = await response.json();
      const bookingId = data.bookingId || data.booking?.id;
      if (!bookingId) {
        throw new Error("Invalid response from server");
      }
      router.push(`/bookings/${bookingId}?created=true`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create booking"
      );
      setIsCreating(false);
    }
  };

  const idTypeLabels: Record<string, string> = {
    STUDENT_ID: "Student ID",
    NATIONAL_ID: "National ID",
    STAFF_ID: "Staff ID",
    PASSPORT: "Passport",
    OTHER: "Other ID",
  };

  return (
    <div className="bg-white border border-[#E3E8E5] rounded-xl p-6 md:p-8 space-y-6 shadow-xs">
      <div className="border-b border-[#F3F6F4] pb-4">
        <h2 className="text-2xl font-extrabold text-[#0A0A0A] tracking-tight">
          Review Booking Details
        </h2>
        <p className="text-xs text-[#66706A] mt-1">
          Verify passenger names and route information before reserving your seats.
        </p>
      </div>

      {/* 1. Trip Summary */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-brand-green uppercase tracking-wider">
            1. Departure Route
          </span>
          <button
            type="button"
            onClick={onBack}
            className="text-xs text-brand-green hover:text-[#066044] font-semibold underline"
          >
            Change
          </button>
        </div>
        <div className="bg-[#F8FAF9] border border-[#E3E8E5] rounded-lg p-4">
          <div className="text-lg font-bold text-[#171717] flex items-center gap-2">
            <span>{trip.route?.originCampus?.name || "Campus"}</span>
            <span className="text-brand-green">──→</span>
            <span>{trip.route?.destination?.name || "Destination"}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#66706A] font-medium mt-1">
            <span className="font-mono font-bold text-[#171717] tabular-nums">{timeStr}</span>
            <span>·</span>
            <span>{dateStr}</span>
            <span>·</span>
            <span>{passengers.length} {passengers.length === 1 ? "seat" : "seats"}</span>
          </div>
          <div className="text-xs font-semibold mt-1.5">
            {trip.vehicle ? (
              <span className="text-brand-green">
                Assigned Transport: {trip.vehicle.name} ({trip.vehicle.plateNumber})
              </span>
            ) : (
              <span className="text-[#D97706] bg-[#FFFBEB] px-2 py-0.5 rounded border border-[#FDE68A] text-[11px]">
                Vehicle to be assigned
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Passengers */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-brand-green uppercase tracking-wider">
            2. Passenger List ({passengers.length})
          </span>
          <button
            type="button"
            onClick={onBack}
            className="text-xs text-brand-green hover:text-[#066044] font-semibold underline"
          >
            Edit Names
          </button>
        </div>
        <div className="border border-[#E3E8E5] rounded-lg divide-y divide-[#E3E8E5] overflow-hidden">
          {passengers.map((p, i) => (
            <div key={i} className="p-3.5 bg-white flex items-center justify-between text-xs">
              <div>
                <div className="font-bold text-[#171717]">
                  {i + 1}. {p.fullName}
                </div>
                <div className="text-[11px] text-[#66706A] font-mono mt-0.5">
                  {idTypeLabels[p.identityType] || p.identityType}: {p.identityNumber}
                </div>
              </div>
              {p.phone && (
                <div className="font-mono text-[#66706A] text-[11px]">
                  {p.phone}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 3. Fare Breakdown */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-brand-green uppercase tracking-wider">
          3. Fare Calculation
        </span>
        <div className="bg-[#F8FAF9] border border-[#E3E8E5] rounded-lg p-4 space-y-2 text-xs">
          <div className="flex justify-between text-[#66706A]">
            <span>Ticket Fare ({passengers.length} × ETB {trip.farePerSeat})</span>
            <span className="font-mono font-semibold text-[#171717] tabular-nums">ETB {totalFare}</span>
          </div>
          <div className="border-t border-[#E3E8E5] pt-3 flex justify-between items-baseline">
            <span className="font-extrabold text-sm text-[#0A0A0A]">Total to Pay</span>
            <span className="text-2xl font-extrabold font-mono text-[#0A0A0A] tabular-nums">
              ETB {totalFare}
            </span>
          </div>
        </div>
      </div>

      {/* Terms confirmation */}
      <div className="border border-[#E3E8E5] bg-[#F8FAF9] rounded-lg p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            id="terms"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-[#E3E8E5] text-brand-green focus:ring-brand-green"
          />
          <span className="text-xs text-[#66706A] leading-relaxed">
            I confirm that all passengers carry matching physical identity documents. Seats are reserved upon submission and confirmed once payment proof is verified by university transport dispatch.
          </span>
        </label>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="flex items-center gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          onClick={onBack}
          disabled={isCreating}
          className="flex-1"
        >
          ← Back
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!termsAccepted || isCreating}
          className="flex-1 font-bold shadow-xs"
          size="large"
        >
          {isCreating ? "Reserving..." : "Confirm & Reserve Seats →"}
        </Button>
      </div>
    </div>
  );
}
