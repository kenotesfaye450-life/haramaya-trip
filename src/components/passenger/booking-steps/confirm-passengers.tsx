"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import type { Trip } from "../booking-flow";

interface ConfirmPassengersProps {
  trip: Trip;
  initialCount: number;
  onConfirm: (count: number) => void;
  onBack: () => void;
}

export function ConfirmPassengers({
  trip,
  initialCount,
  onConfirm,
  onBack,
}: ConfirmPassengersProps) {
  const [count, setCount] = useState(String(initialCount));
  const availableSeats = trip.seatCapacity - trip.seatsReserved;
  const passengerCount = parseInt(count, 10);
  const totalFare = trip.farePerSeat * passengerCount;
  const hasError = passengerCount > availableSeats;

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

  const maxSelectable = Math.max(1, availableSeats);
  const passengerOptions = Array.from(
    { length: Math.min(maxSelectable, 60) },
    (_, i) => ({
      value: String(i + 1),
      label: `${i + 1} ${i === 0 ? "Passenger" : "Passengers"}`,
    })
  );

  return (
    <div className="space-y-6">
      {/* Route & Departure Header Card */}
      <div className="bg-white border border-[#E3E8E5] rounded-xl p-6 space-y-3 shadow-xs">
        <div className="text-[11px] text-brand-green uppercase tracking-wider font-bold">
          Trip Selected
        </div>
        <div className="text-xl md:text-2xl font-extrabold tracking-tight text-[#0A0A0A] flex items-center gap-2">
          <span>{trip.route?.originLocation?.name || "Campus"}</span>
          <span className="text-brand-green font-normal">──→</span>
          <span>{trip.route?.destinationLocation?.name || "Destination"}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#66706A] font-medium pt-0.5">
          <span className="font-mono font-bold text-[#171717] tabular-nums">{timeStr}</span>
          <span>·</span>
          <span>{dateStr}</span>
          <span>·</span>
          <span className="text-brand-green font-semibold">{availableSeats} seats remaining</span>
        </div>
      </div>

      {/* Passenger Selection Form */}
      <div className="bg-white border border-[#E3E8E5] rounded-xl p-6 space-y-6 shadow-xs">
        <div>
          <Select
            label="How many passengers are traveling?"
            options={passengerOptions}
            value={count}
            onChange={(e) => setCount(e.target.value)}
            required
            error={hasError}
            helperText={
              hasError
                ? `Only ${availableSeats} seats remaining on this trip`
                : "You will provide passenger names and ID numbers in the next step"
            }
          />
        </div>

        {/* Pricing Summary */}
        <div className="border-t border-[#F3F6F4] pt-5 space-y-2 text-xs">
          <div className="flex justify-between text-[#66706A]">
            <span>Ticket fare per seat</span>
            <span className="font-mono font-semibold text-[#171717] tabular-nums">
              ETB {trip.farePerSeat}
            </span>
          </div>
          <div className="flex justify-between text-[#66706A]">
            <span>Number of passengers</span>
            <span className="font-mono font-semibold text-[#171717] tabular-nums">
              × {passengerCount}
            </span>
          </div>
          <div className="border-t border-[#E3E8E5] pt-3.5 flex justify-between items-baseline">
            <span className="font-bold text-sm text-[#0A0A0A]">Total Amount</span>
            <span className="text-2xl font-extrabold font-mono text-[#0A0A0A] tabular-nums">
              ETB {totalFare}
            </span>
          </div>
        </div>

        {hasError && (
          <Alert variant="error">
            Not enough seats available. Please reduce party size.
          </Alert>
        )}

        <div className="flex items-center gap-3 pt-2">
          <Button
            type="button"
            variant="neutral"
            onClick={onBack}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => onConfirm(passengerCount)}
            disabled={hasError || passengerCount < 1}
            className="flex-1 font-bold shadow-xs"
            size="large"
          >
            Continue to Details →
          </Button>
        </div>
      </div>
    </div>
  );
}
