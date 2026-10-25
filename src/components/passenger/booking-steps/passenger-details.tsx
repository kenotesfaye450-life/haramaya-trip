"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { Trip } from "../booking-flow";

interface PassengerData {
  fullName: string;
  phone: string;
  identityType: string;
  identityNumber: string;
  age?: string;
  sex?: string;
}

interface PassengerDetailsProps {
  passengers: PassengerData[];
  trip?: Trip;
  onUpdate: (index: number, data: PassengerData) => void;
  onComplete: () => void;
  onBack: () => void;
}

export function PassengerDetails({
  passengers,
  onUpdate,
  onComplete,
  onBack,
}: PassengerDetailsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedIndices, setCompletedIndices] = useState<Set<number>>(
    new Set()
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const currentPassenger = passengers[currentIndex];
  const isLastPassenger = currentIndex === passengers.length - 1;

  const validatePassenger = (data: PassengerData): boolean => {
    const newErrors: Record<string, string> = {};

    if (!data.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    }
    
    // Child / Dependent handling (Requirement 9)
    if (data.identityType === "OTHER") {
      if (!data.identityNumber.trim()) {
        data.identityNumber = "CHILD-DEPENDENT";
      }
    } else if (!data.identityNumber.trim()) {
      newErrors.identityNumber = "ID number is required";
    }

    if (currentIndex === 0 && !data.phone.trim()) {
      newErrors.phone = "Primary contact phone is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFieldChange = (field: keyof PassengerData, value: string) => {
    const updated = { ...currentPassenger, [field]: value };
    // If switching to child/dependent, auto-suggest dependent ID
    if (field === "identityType" && value === "OTHER" && !updated.identityNumber) {
      updated.identityNumber = "CHILD-DEPENDENT";
    }
    onUpdate(currentIndex, updated);
    if (errors[field]) {
      setErrors((prev) => {
        const errs = { ...prev };
        delete errs[field];
        return errs;
      });
    }
  };

  const handleNext = () => {
    if (!validatePassenger(currentPassenger)) {
      return;
    }

    setCompletedIndices((prev) => new Set(prev).add(currentIndex));

    if (isLastPassenger) {
      onComplete();
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    } else {
      onBack();
    }
  };

  const handleJumpTo = (index: number) => {
    if (completedIndices.has(index) || index === currentIndex) {
      setCurrentIndex(index);
    }
  };

  const idTypeOptions = [
    { value: "STUDENT_ID", label: "Student ID" },
    { value: "STAFF_ID", label: "University Staff ID" },
    { value: "NATIONAL_ID", label: "National ID (Kebele / Fayda)" },
    { value: "PASSPORT", label: "Passport / Driving Licence" },
    { value: "OTHER", label: "Child / Minor / Dependent (No Adult ID Required)" },
  ];

  return (
    <div className="space-y-6">
      {/* Compact Green-Led Passenger Selector */}
      {passengers.length > 1 && (
        <div className="bg-white border border-[#E3E8E5] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-[#171717] uppercase tracking-wider">
              Passenger {currentIndex + 1} of {passengers.length}
            </span>
            <span className="text-xs text-brand-green font-mono font-bold">
              {completedIndices.size} of {passengers.length} completed
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {passengers.map((p, index) => {
              const isCompleted = completedIndices.has(index);
              const isCurrent = index === currentIndex;

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleJumpTo(index)}
                  className={`h-8 px-3 rounded-lg text-xs font-bold transition-all border ${
                    isCurrent
                      ? "bg-brand-green text-white border-brand-green shadow-xs"
                      : isCompleted
                      ? "bg-[#ECFDF5] text-brand-green border-[#A7F3D0] hover:bg-[#D1FAE5]"
                      : "bg-white text-[#87918B] border-[#E3E8E5] hover:border-[#D1D8D4]"
                  }`}
                >
                  {isCompleted ? `✓ ${index + 1}. ${p.fullName ? p.fullName.split(" ")[0] : "Done"}` : `Passenger ${index + 1}`}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Active Passenger Form */}
      <div className="bg-white border border-[#E3E8E5] rounded-xl p-6 md:p-7 space-y-5 shadow-xs">
        <div className="border-b border-[#F3F6F4] pb-4">
          <div className="text-xs text-brand-green font-bold uppercase tracking-wider">
            Passenger {currentIndex + 1}
          </div>
          <h2 className="text-xl font-extrabold text-[#0A0A0A] tracking-tight mt-0.5">
            Traveler Identification
          </h2>
          <p className="text-xs text-[#66706A] mt-1">
            {currentIndex === 0
              ? "Primary contact for booking alerts. Must present matching physical ID before boarding."
              : "Passenger must show matching physical identity card at the campus check-in desk."}
          </p>
        </div>

        <Input
          label="Full Legal Name"
          value={currentPassenger.fullName}
          onChange={(e) => handleFieldChange("fullName", e.target.value)}
          required
          error={!!errors.fullName}
          helperText={errors.fullName || "As displayed on student or national ID card"}
          placeholder="First Middle Last"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Identification Document"
            options={idTypeOptions}
            value={currentPassenger.identityType}
            onChange={(e) => handleFieldChange("identityType", e.target.value)}
            required
          />

          <Input
            label="ID / Registration Number"
            value={currentPassenger.identityNumber}
            onChange={(e) => handleFieldChange("identityNumber", e.target.value)}
            required
            error={!!errors.identityNumber}
            helperText={errors.identityNumber || "Verified by university staff at boarding gate"}
            placeholder="e.g. UGR/1234/14"
          />
        </div>

        {currentIndex === 0 ? (
          <Input
            label="Contact Mobile Phone"
            type="tel"
            value={currentPassenger.phone}
            onChange={(e) => handleFieldChange("phone", e.target.value)}
            required
            error={!!errors.phone}
            helperText={errors.phone || "Receives departure reminders and payment verification alerts"}
            placeholder="0912345678"
          />
        ) : (
          <Input
            label="Passenger Phone (Optional)"
            type="tel"
            value={currentPassenger.phone}
            onChange={(e) => handleFieldChange("phone", e.target.value)}
            placeholder="0912345678"
          />
        )}

        <div className="flex items-center gap-3 pt-4 border-t border-[#F3F6F4]">
          <Button
            type="button"
            variant="secondary"
            onClick={handlePrevious}
            className="flex-1"
          >
            {currentIndex === 0 ? "← Back" : "← Previous Passenger"}
          </Button>
          <Button
            type="button"
            onClick={handleNext}
            className="flex-1 font-bold shadow-xs"
            size="large"
          >
            {isLastPassenger ? "Review Booking →" : "Next Passenger →"}
          </Button>
        </div>
      </div>
    </div>
  );
}
