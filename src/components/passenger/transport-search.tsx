"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

interface RouteItem {
  id: string;
  name: string;
  originCampus: { id: string; name: string; code?: string };
  destination: { id: string; name: string; code?: string };
}

interface Option {
  id: string;
  name: string;
  code?: string;
}

interface TransportSearchProps {
  routes?: RouteItem[];
  campuses?: Option[];
  destinations?: Option[];
  initialFrom?: string;
  initialTo?: string;
  initialDate?: string;
  initialPassengers?: string;
}

export function TransportSearch({
  routes = [],
  campuses = [],
  destinations = [],
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
  const [swapNotice, setSwapNotice] = useState<string | null>(null);

  // Derive unique origins from configured active routes
  const availableOrigins = useMemo(() => {
    if (routes.length > 0) {
      const map = new Map<string, { id: string; name: string }>();
      for (const r of routes) {
        if (r.originCampus) {
          map.set(r.originCampus.id, {
            id: r.originCampus.id,
            name: r.originCampus.name,
          });
        }
      }
      return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    }
    return campuses;
  }, [routes, campuses]);

  // Derive destinations that are reachable from the selected origin
  const reachableDestinations = useMemo(() => {
    if (routes.length > 0) {
      const map = new Map<string, { id: string; name: string }>();
      const matchingRoutes = from
        ? routes.filter((r) => r.originCampus?.id === from)
        : routes;

      for (const r of matchingRoutes) {
        if (r.destination) {
          map.set(r.destination.id, {
            id: r.destination.id,
            name: r.destination.name,
          });
        }
      }
      return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    }
    return destinations;
  }, [routes, destinations, from]);

  // Handle origin change & adjust destination if no longer valid
  const handleFromChange = (newFrom: string) => {
    setFrom(newFrom);
    setSwapNotice(null);

    if (newFrom && routes.length > 0) {
      const validDestinations = routes
        .filter((r) => r.originCampus?.id === newFrom)
        .map((r) => r.destination?.id);

      if (to && !validDestinations.includes(to)) {
        // Current destination is not reachable from new origin
        setTo("");
      }
    }
  };

  // Smart swap function
  const handleSwap = () => {
    setSwapNotice(null);

    if (!from || !to) {
      // Simple toggle if only one is selected
      const tempFrom = from;
      setFrom(to);
      setTo(tempFrom);
      return;
    }

    if (routes.length > 0) {
      // Find the names of current from and to
      const currentOriginObj = availableOrigins.find((o) => o.id === from);
      const currentDestObj = reachableDestinations.find((d) => d.id === to);
      const fromName = currentOriginObj?.name || "current origin";
      const toName = currentDestObj?.name || "current destination";

      // Check if there is an active route where origin matches current 'to' and destination matches current 'from'
      // Notice: In the database, the reverse origin must match by location ID or code
      const reverseRoute = routes.find((r) => {
        const originMatches =
          r.originCampus?.id === to ||
          r.originCampus?.name.toLowerCase() === toName.toLowerCase();
        const destMatches =
          r.destination?.id === from ||
          r.destination?.name.toLowerCase() === fromName.toLowerCase();
        return originMatches && destMatches;
      });

      if (reverseRoute) {
        setFrom(reverseRoute.originCampus.id);
        setTo(reverseRoute.destination.id);
      } else {
        // Reverse route does not exist
        setSwapNotice(
          `No return route is configured from ${toName} back to ${fromName}.`
        );
      }
    } else {
      const temp = from;
      setFrom(to);
      setTo(temp);
    }
  };

  const originOptions = [
    { value: "", label: "Select departure location" },
    ...availableOrigins.map((o) => ({ value: o.id, label: o.name })),
  ];

  const destinationOptions = [
    {
      value: "",
      label: from
        ? "Select arrival destination"
        : "Select arrival destination (or choose origin first)",
    },
    ...reachableDestinations.map((d) => ({ value: d.id, label: d.name })),
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
            <button
              type="button"
              onClick={handleSwap}
              title="Swap departure and arrival locations"
              className="w-10 h-10 rounded-lg bg-[#F4F8FC] hover:bg-[#E7F0FA] border border-[#D8E5F2] text-brand-green flex items-center justify-center transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </button>
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
                setSwapNotice(null);
              }}
              required
            />
          </div>
        </div>

        {/* Swap Notice if reverse route not found */}
        {swapNotice && (
          <div className="bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] text-xs px-3.5 py-2.5 rounded-lg flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0 text-[#D97706]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{swapNotice}</span>
          </div>
        )}

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
