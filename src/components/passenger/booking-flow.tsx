"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
    originLocation?: { id?: string; name: string } | null;
    destinationLocation?: { id?: string; name: string } | null;
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

type BookingStep = "confirm" | "details" | "review";

function normalizeStep(value: string | null | undefined): BookingStep {
  return value === "details" || value === "review" ? value : "confirm";
}

function normalizeCount(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 60
    ? parsed
    : Math.max(1, Math.min(60, fallback));
}

function emptyPassenger(): PassengerData {
  return {
    fullName: "",
    phone: "",
    identityType: "STUDENT_ID",
    identityNumber: "",
    age: "",
    sex: "",
  };
}

function initialPassenger(account: SessionAccount): PassengerData {
  return {
    fullName: account.fullName || "",
    phone: account.phone || "",
    identityType: "STUDENT_ID",
    identityNumber: "",
    age: "",
    sex: "",
  };
}

export function BookingFlow({
  trip,
  account,
  initialPassengerCount,
  currentStep: initialStep,
}: BookingFlowProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const stepParam = searchParams.get("step");
  const countParam = searchParams.get("passengers");
  const requestedStep = normalizeStep(stepParam ?? initialStep);
  const passengerCount = normalizeCount(countParam, initialPassengerCount);
  const [passengers, setPassengers] = useState<PassengerData[]>(() =>
    Array.from({ length: passengerCount }, (_, index) =>
      index === 0 ? initialPassenger(account) : emptyPassenger()
    )
  );
  const privacyNotice = requestedStep === "details" && searchParams.get("notice") === "identity";
  const hasDetailsHistory = useRef(false);
  const hasReviewHistory = useRef(false);

  const visiblePassengers = Array.from(
    { length: passengerCount },
    (_, index) => passengers[index] ?? emptyPassenger(),
  );
  const reviewDataComplete =
    visiblePassengers.length === passengerCount &&
    visiblePassengers.every(
      (passenger, index) =>
        passenger.fullName.trim().length > 0 &&
        passenger.identityNumber.trim().length > 0 &&
        (index > 0 || passenger.phone.trim().length > 0)
    );
  const step: BookingStep =
    requestedStep === "review" && !reviewDataComplete
      ? "details"
      : requestedStep;

  useEffect(() => {
    const count = normalizeCount(countParam, initialPassengerCount);
    const normalizedStep = normalizeStep(stepParam ?? initialStep);
    const missingReviewData = normalizedStep === "review" && !reviewDataComplete;

    if (missingReviewData) {

      const params = new URLSearchParams({
        passengers: String(count),
        step: "details",
        notice: "identity",
      });
      router.replace(
        "/trips/" + encodeURIComponent(trip.id) + "/book?" + params.toString(),
        { scroll: false }
      );
      return;
    }

    const expectedCount = String(count);
    const expectedStep = normalizedStep;
    if (
      countParam !== expectedCount ||
      stepParam !== expectedStep
    ) {
      const params = new URLSearchParams({
        passengers: expectedCount,
        step: expectedStep,
      });
      router.replace(
        "/trips/" + encodeURIComponent(trip.id) + "/book?" + params.toString(),
        { scroll: false }
      );
    }
  }, [
    countParam,
    initialPassengerCount,
    initialStep,
    router,
    searchKey,
    stepParam,
    trip.id,
    reviewDataComplete,
  ]);

  const updateUrl = (nextStep: BookingStep, count: number, replace = false) => {
    const params = new URLSearchParams({
      passengers: String(count),
      step: nextStep,
    });
    const href =
      "/trips/" + encodeURIComponent(trip.id) + "/book?" + params.toString();

    if (replace) {
      router.replace(href, { scroll: false });
    } else {
      router.push(href, { scroll: false });
    }
  };

  const handleConfirmPassengers = (count: number) => {
    const nextPassengers = [...passengers];
    while (nextPassengers.length < count) {
      nextPassengers.push(emptyPassenger());
    }
    setPassengers(nextPassengers);

    hasDetailsHistory.current = true;
    updateUrl("details", count);
  };

  const handlePassengerUpdate = (index: number, data: PassengerData) => {
    setPassengers((current) => {
      const updated = [...current];
      updated[index] = data;
      return updated;
    });
  };

  const handleDetailsComplete = () => {

    hasReviewHistory.current = true;
    updateUrl("review", passengerCount);
  };

  const handleBackToConfirm = () => {
    if (hasDetailsHistory.current) {
      router.back();
    } else {
      updateUrl("confirm", passengerCount, true);
    }
  };

  const handleBackToDetails = () => {
    if (hasReviewHistory.current) {
      router.back();
    } else {
      updateUrl("details", passengerCount, true);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <BookingProgress current="Passengers" />

      {privacyNotice && (
        <div className="rounded-lg border border-[#D8E5F2] bg-[#F4F8FC] px-4 py-3 text-sm text-[#344B63]" role="status">
          Passenger identity details are not stored in this browser. Please re-enter them to review the booking.
        </div>
      )}

      {step === "confirm" && (
        <ConfirmPassengers
          trip={trip}
          initialCount={passengerCount}
          onConfirm={handleConfirmPassengers}
          onBack={() => router.back()}
        />
      )}

      <div hidden={step !== "details"}>
        <PassengerDetails
          passengers={visiblePassengers}
          trip={trip}
          onUpdate={handlePassengerUpdate}
          onComplete={handleDetailsComplete}
          onBack={handleBackToConfirm}
        />
      </div>

      <div hidden={step !== "review"}>
        <BookingReview
          trip={trip}
          account={account}
          passengers={visiblePassengers}
          onBack={handleBackToDetails}
        />
      </div>
    </div>
  );
}
