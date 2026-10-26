"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

interface Option {
  id: string;
  name: string;
  code?: string;
}

interface TransportSearchProps {
  locations: Option[];
  initialFrom?: string;
  initialTo?: string;
  initialDate?: string;
  initialPassengers?: string;
}

export function TransportSearch({
  locations,
  initialFrom = "",
  initialTo = "",
  initialDate = "",
  initialPassengers = "1",
}: TransportSearchProps) {
  const router = useRouter();
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [date, setDate] = useState(initialDate);
  const [passengers, setPassengers] = useState(initialPassengers);
  const handleFromChange = (newFrom: string) => setFrom(newFrom);

  const handleSwap = () => {
    setFrom(to);
    setTo(from);
  };

  const originOptions = [
    { value: "", label: "Select departure location" },
    ...locations.map((location) => ({ value: location.id, label: location.name })),
  ];

  const destinationOptions = [
    { value: "", label: "Select destination" },
    ...locations.map((location) => ({ value: location.id, label: location.name })),
  ];

  const passengerOptions = Array.from({ length: 20 }, (_, i) => ({
    value: String(i + 1),
    label: `${i + 1} ${i === 0 ? "Passenger" : "Passengers"}`,
  }));

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (date) params.set("date", date);
    if (passengers) params.set("passengers", passengers);

    router.push(`/trips?${params.toString()}`);
  };

  return (
    <div className="bg-white border border-[#DCE4EC] rounded-xl p-4 sm:p-5">

      <form onSubmit={handleSearch} className="space-y-4">
        {/* Route Row: From & To with Visual Transit Motif */}
        <div className="relative grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-3">
          {/* From Field */}
          <div className="relative">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-green inline-block flex-shrink-0" />
              <span className="text-xs font-semibold text-[#344B63]">
                From
              </span>
            </div>
            <Select
              options={originOptions}
              value={from}
              onChange={(e) => handleFromChange(e.target.value)}
              required
            />
          </div>

          {/* Swap Control */}
          <div className="flex justify-center -my-1 md:my-0 md:pt-5">
            <Button
              type="button"
              variant="neutral"
              onClick={handleSwap}
              aria-label="Swap departure and arrival locations"
              title="Swap departure and arrival locations"
              className="h-10 w-10 min-h-10 rounded-lg px-0 py-0 text-brand-green"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </Button>
          </div>

          {/* To Field */}
          <div className="relative">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="w-2.5 h-2.5 rounded-full border-2 border-brand-green bg-white inline-block flex-shrink-0" />
              <span className="text-xs font-semibold text-[#344B63]">
                To
              </span>
            </div>
            <Select
              options={destinationOptions}
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
              }}
              required
            />
          </div>
        </div>

        {/* Date and Passengers Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 border-t border-[#F3F6F4]">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <svg className="w-3.5 h-3.5 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs font-semibold text-[#344B63]">
                Travel Date
              </span>
            </div>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
            />
          </div>

          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <svg className="w-3.5 h-3.5 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-xs font-semibold text-[#344B63]">
                Travelers
              </span>
            </div>
            <Select
              options={passengerOptions}
              value={passengers}
              onChange={(e) => setPassengers(e.target.value)}
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <Button
            type="submit"
            fullWidth
            size="large"
            className="font-bold tracking-wide shadow-sm"
          >
            Find transport
          </Button>
        </div>
      </form>
    </div>
  );
}
