"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { QRCode } from "@/components/ui/qr-code";
import { BrandEmblem } from "@/components/brand-logo";
import { BookingProgress } from "./booking-progress";

interface Booking {
  id: string;
  reference: string;
  partySize: number;
  trip?: {
    id: string;
    departureAt: Date | string;
    route?: {
      originCampus?: { name: string } | null;
      destination?: { name: string } | null;
    } | null;
    vehicle?: {
      name: string;
      plateNumber: string;
    } | null;
  } | null;
  passengers?: Array<{
    id: string;
    fullName: string;
    identityType: string;
    identityNumber: string;
    checkInStatus: string;
    checkedInAt: Date | string | null;
    ticket?: { publicCode: string } | null;
  }>;
}

interface DigitalTicketProps {
  booking: Booking;
  ticketQrValues: Record<string, string>;
}

export function DigitalTicket({ booking, ticketQrValues }: DigitalTicketProps) {
  const [activePassengerIndex, setActivePassengerIndex] = useState(0);
  const [sharedNotice, setSharedNotice] = useState<string | null>(null);

  const trip = booking.trip;
  const route = trip?.route;
  const departureDate = trip ? new Date(trip.departureAt) : null;

  const passengers = booking.passengers || [];
  const currentPassenger = passengers[activePassengerIndex] || null;

  const qrData = currentPassenger ? ticketQrValues[currentPassenger.id] ?? "" : "";
  const backupCode = currentPassenger?.ticket?.publicCode ?? "Unavailable";

  const handleShare = async () => {
    const shareData = {
      title: `HU Transport Pass - ${booking.reference}`,
      text: `Boarding Pass for ${currentPassenger?.fullName || "Passenger"} on ${route?.originCampus?.name} → ${route?.destination?.name}. Reference: ${booking.reference}`,
      url: typeof window !== "undefined" ? window.location.href : "",
    };
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setSharedNotice("Could not share this ticket from the current browser.");
          setTimeout(() => setSharedNotice(null), 4000);
        }
      }
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setSharedNotice("Ticket link copied to clipboard");
        setTimeout(() => setSharedNotice(null), 3000);
      } catch {
        setSharedNotice("Sharing and clipboard access are unavailable in this browser.");
        setTimeout(() => setSharedNotice(null), 4000);
      }
    } else {
      setSharedNotice("Sharing is unavailable in this browser.");
      setTimeout(() => setSharedNotice(null), 4000);
    }
  };

  const dateStr = departureDate?.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = departureDate?.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div className="max-w-md mx-auto space-y-4">
      {/* Top action bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Button variant="secondary" size="sm" asChild>
          <Link href={`/bookings/${booking.id}`} className="inline-flex items-center gap-1.5 text-xs">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Booking Details</span>
          </Link>
        </Button>
        <div className="flex items-center gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleShare}
            className="inline-flex items-center gap-1 text-xs"
            title="Share boarding pass"
          >
            <span>Share</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1 text-xs"
          >
            <span>Print</span>
          </Button>
        </div>
      </div>

      <div className="print:hidden">
        <BookingProgress current="Ticket" />
      </div>

      {sharedNotice && (
        <div className="text-xs p-2.5 rounded-lg border border-[#A7F3D0] bg-[#ECFDF5] text-[#066044] font-medium text-center print:hidden">
          {sharedNotice}
        </div>
      )}

      {/* Passenger Selector if multiple */}
      {passengers.length > 1 && (
        <div className="bg-white border border-[#E3E8E5] rounded-xl p-3 flex items-center justify-between shadow-xs print:hidden">
          <span className="text-xs font-semibold text-[#66706A] uppercase tracking-wide">
            Passenger {activePassengerIndex + 1} of {passengers.length}
          </span>
          <div className="flex gap-1.5">
            {passengers.map((p, idx) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setActivePassengerIndex(idx)}
                className={`h-7 px-2.5 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer ${
                  idx === activePassengerIndex
                    ? "bg-brand-green text-white shadow-xs"
                    : "bg-[#F3F6F4] text-[#171717] hover:bg-[#E3E8E5]"
                }`}
              >
                P{idx + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Modern Transportation Boarding Pass Ticket */}
      <div className="bg-white border-2 border-[#0A0A0A] rounded-xl shadow-md overflow-hidden print:border print:shadow-none">
        {/* Brand Header Bar - Dominant Green */}
        <div className="bg-brand-green text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BrandEmblem size={28} />
            <div>
              <span className="text-xs font-bold tracking-wider uppercase block">
                Haramaya Trip
              </span>
              <span className="text-[10px] text-white/80 uppercase tracking-widest block font-medium">
                Official Boarding Pass
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono bg-white/20 px-2 py-0.5 rounded text-white uppercase tracking-wider font-semibold">
            Boarding Pass
          </span>
        </div>

        <div className="p-6 space-y-5">
          {/* Status & Reference Header */}
          <div className="flex items-center justify-between">
            <Badge variant="success">CONFIRMED</Badge>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-[#66706A] tracking-wider block">Reference</span>
              <span className="text-xs font-mono font-bold text-[#0A0A0A]">
                {booking.reference}
              </span>
            </div>
          </div>

          {/* Route Display - Dominant Transportation Connected Arrow */}
          <div className="bg-[#F8FAF9] border border-[#E3E8E5] rounded-xl p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-[#66706A] uppercase tracking-wider mb-2">
              <span>Departure Campus</span>
              <span>Arrival Destination</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <div className="text-lg md:text-xl font-black text-[#0A0A0A] tracking-tight leading-tight">
                  {route?.originCampus?.name || "Main Campus"}
                </div>
              </div>
              <div className="flex items-center gap-1 text-brand-green flex-shrink-0 px-2">
                <span className="w-2 h-2 rounded-full bg-brand-green" />
                <span className="w-8 md:w-12 h-0.5 bg-brand-green" />
                <svg className="w-4 h-4 -ml-1 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <div className="flex-1 text-right">
                <div className="text-lg md:text-xl font-black text-[#0A0A0A] tracking-tight leading-tight">
                  {route?.destination?.name || "Destination"}
                </div>
              </div>
            </div>
          </div>

          {/* Departure Time & Date */}
          <div className="text-center py-1">
            <div className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#0A0A0A] font-mono">
              {timeStr}
            </div>
            <div className="text-xs font-semibold text-[#66706A] mt-1">
              {dateStr}
            </div>
          </div>

          {/* Passenger Information Card */}
          <div className="bg-white border border-[#E3E8E5] rounded-xl p-4 space-y-2.5 text-xs shadow-xs">
            <div className="flex justify-between items-baseline">
              <span className="text-[#66706A] uppercase font-semibold text-[11px]">Passenger Name</span>
              <span className="font-bold text-[#0A0A0A] text-sm">
                {currentPassenger?.fullName || "Student Passenger"}
              </span>
            </div>
            {currentPassenger?.identityNumber && (
              <div className="flex justify-between items-baseline">
                <span className="text-[#66706A] uppercase font-semibold text-[11px]">
                  {currentPassenger.identityType.replace("_", " ")}
                </span>
                <span className="font-mono font-semibold text-[#171717]">
                  {currentPassenger.identityNumber}
                </span>
              </div>
            )}
            <div className="flex justify-between items-baseline border-t border-[#E3E8E5] pt-2">
              <span className="text-[#66706A] uppercase font-semibold text-[11px]">Boarding Point</span>
              <span className="text-[#171717] font-semibold">
                {route?.originCampus?.name || "Origin Location"} Gate
              </span>
            </div>
            <div className="flex justify-between items-baseline border-t border-[#E3E8E5] pt-2">
              <span className="text-[#66706A] uppercase font-semibold text-[11px]">Assigned Transport</span>
              {trip?.vehicle ? (
                <span className="text-brand-green font-semibold">
                  {trip.vehicle.name} ({trip.vehicle.plateNumber})
                </span>
              ) : (
                <span className="text-[#D97706] font-semibold bg-[#FFFBEB] px-2 py-0.5 rounded border border-[#FDE68A] text-[11px]">
                  Vehicle to be assigned
                </span>
              )}
            </div>
          </div>

          {/* Notch divider effect */}
          <div className="relative flex items-center justify-center my-2">
            <div className="w-full border-t border-dashed border-[#CBD5E1]" />
          </div>

          {/* QR Code Section - White & Uncluttered */}
          <div className="flex flex-col items-center justify-center pt-1 pb-1">
            <div className="bg-white p-3.5 border-2 border-[#E3E8E5] rounded-xl inline-block shadow-xs">
              {qrData ? (
                <QRCode value={qrData} size={170} />
              ) : (
                <p className="px-4 py-8 text-center text-xs text-zinc-600">
                  Ticket is not available for this passenger.
                </p>
              )}
            </div>
            <div className="mt-3 text-center">
              <div className="font-mono text-base font-bold tracking-widest text-[#0A0A0A]">
                {backupCode}
              </div>
              <div className="text-[10px] text-[#66706A] uppercase tracking-wider font-semibold mt-0.5">
                Staff Check-In Verification Code
              </div>
            </div>
          </div>

          {/* Ticket Footer Notes */}
          <div className="border-t border-[#E3E8E5] pt-3 text-center text-[11px] text-[#66706A] leading-relaxed">
            Please arrive at the campus departure gate 15 minutes prior to scheduled departure.
            Physical ID must match the name registered on this boarding pass.
          </div>
        </div>
      </div>
    </div>
  );
}
