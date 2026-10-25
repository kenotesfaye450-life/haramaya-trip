"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmPassengers } from "./booking-steps/confirm-passengers";
import { PassengerDetails } from "./booking-steps/passenger-details";
import { BookingReview } from "./booking-steps/booking-review";
import { BookingProgress } from "./booking-progress";
import type { SessionAccount } from "@/lib/auth";

export interface Trip {
  id: string;
  departureAt: Date | string;
  seatCapacity: number;
  seatsReserved: number;
  farePerSeat: number;
  route?: {
    name?: string | null;
    originCampus?: { id?: string; name: string } | null;
    destination?: { id?: string; name: string } | null;
  } | null;
  vehicle?: {
    name: string;
    plateNumber: string;
    seatCapacity?: number;
  } | null;
}

interface PassengerData {
  fullName: string;
  phone: string;
  identityType: string;
  identityNumber: string;
  age?: string;
  sex?: string;
}

interface BookingFlowProps {
  trip: Trip;
  account: SessionAccount;
  initialPassengerCount: number;
  currentStep: string;
}

export function BookingFlow({
  trip,
  account,
  initialPassengerCount,
  currentStep: initialStep,
}: BookingFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState(initialStep);
  const [passengerCount, setPassengerCount] = useState(initialPassengerCount);
  const [passengers, setPassengers] = useState<PassengerData[]>(
    Array(initialPassengerCount)
      .fill(null)
      .map((_, i) => ({
        fullName: i === 0 ? account.fullName || "" : "",
        phone: i === 0 ? account.phone || "" : "",
        identityType: "STUDENT_ID",
        identityNumber: "",
        age: "",
        sex: "",
      }))
  );

  const handleConfirmPassengers = (count: number) => {
    setPassengerCount(count);
    if (count !== passengers.length) {
      const newPassengers = Array(count)
        .fill(null)
        .map((_, i) => passengers[i] || {
          fullName: i === 0 ? account.fullName || "" : "",
          phone: i === 0 ? account.phone || "" : "",
          identityType: "STUDENT_ID",
          identityNumber: "",
          age: "",
          sex: "",
        });
      setPassengers(newPassengers);
    }
    setStep("details");
    router.push(`?step=details`, { scroll: false });
  };

  const handlePassengerUpdate = (index: number, data: PassengerData) => {
    const updated = [...passengers];
    updated[index] = data;
    setPassengers(updated);
  };

  const handleDetailsComplete = () => {
    setStep("review");
    router.push(`?step=review`, { scroll: false });
  };

  const handleBack = () => {
    if (step === "details") {
      setStep("confirm");
      router.push(`?step=confirm`, { scroll: false });
    } else if (step === "review") {
      setStep("details");
      router.push(`?step=details`, { scroll: false });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <BookingProgress current="Passengers" />

      {/* Step Content */}
      {step === "confirm" && (
        <ConfirmPassengers
          trip={trip}
          initialCount={passengerCount}
          onConfirm={handleConfirmPassengers}
          onBack={() => router.push("/trips")}
        />
      )}

      {step === "details" && (
        <PassengerDetails
          passengers={passengers}
          trip={trip}
          onUpdate={handlePassengerUpdate}
          onComplete={handleDetailsComplete}
          onBack={handleBack}
        />
      )}

      {step === "review" && (
        <BookingReview
          trip={trip}
          account={account}
          passengers={passengers}
          onBack={handleBack}
        />
      )}
    </div>
  );
}
