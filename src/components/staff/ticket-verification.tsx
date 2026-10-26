"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface VerifiedBooking {
  id: string;
  reference: string;
  partySize: number;
  route: string;
  departureTime: string;
  departureDate: string;
  vehicle: string | null;
}

export interface VerifiedPassenger {
  id: string;
  fullName: string;
  identityType: string;
  identityNumber: string;
  checkInStatus: string;
  checkedInAt?: string | null;
  isTarget?: boolean;
}

interface TicketVerificationProps {
  booking: VerifiedBooking | null;
  passengers: VerifiedPassenger[];
  loading: boolean;
  error: string | null;
  onCheckIn: (passengerId: string, identityVerified: boolean) => Promise<boolean>;
  onClose: () => void;
}

export function TicketVerification({
  booking,
  passengers,
  loading,
  error,
  onCheckIn,
  onClose,
}: TicketVerificationProps) {
  // Local state to track which passenger IDs have had their physical ID confirmed
  const [verifiedIds, setVerifiedIds] = useState<Record<string, boolean>>({});
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [checkedInIds, setCheckedInIds] = useState<Record<string, boolean>>({});

  // Merge server passenger list with local check-in confirmations
  const displayPassengers = passengers.map((p) => {
    if (checkedInIds[p.id]) {
      return {
        ...p,
        checkInStatus: "CHECKED_IN",
        checkedInAt: p.checkedInAt || new Date().toISOString(),
      };
    }
    return p;
  });

  if (loading) {
    return (
      <div className="bg-white border border-[#E3E8E5] rounded-xl p-8 text-center space-y-3 shadow-xs">
        <div className="w-8 h-8 mx-auto border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
        <div className="text-sm font-bold text-[#0A0A0A]">
          Verifying ticket with departure roster...
        </div>
        <p className="text-xs text-[#66706A]">
          Checking digital signature, booking confirmation, and departure match.
        </p>
      </div>
    );
  }

  // 1. Error / Invalid Ticket / Wrong Trip State (Red signal)
  if (error) {
    const isWrongTrip = error.toUpperCase().startsWith("WRONG TRIP");

    return (
      <div className="bg-white border-2 border-[#FECACA] rounded-xl p-6 space-y-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-[#FEF2F2] pb-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center font-bold text-sm">
              ✕
            </span>
            <span className="text-base font-bold text-[#991B1B]">
              {isWrongTrip ? "Wrong Departure Trip" : "Invalid Ticket"}
            </span>
          </div>
          <Badge variant="error">{isWrongTrip ? "Trip Mismatch" : "Verification Failed"}</Badge>
        </div>

        <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-lg p-4 text-xs text-[#991B1B] leading-relaxed">
          {error}
        </div>

        <div className="pt-2">
          <Button onClick={onClose} variant="neutral" fullWidth size="large" className="font-semibold">
            ← Scan Another Ticket
          </Button>
        </div>
      </div>
    );
  }

  if (!booking || displayPassengers.length === 0) {
    return null;
  }

  const allCheckedIn = displayPassengers.every(
    (p) => p.checkInStatus === "CHECKED_IN"
  );

  const toggleVerified = (passengerId: string) => {
    setVerifiedIds((prev) => ({
      ...prev,
      [passengerId]: !prev[passengerId],
    }));
  };

  const handlePassengerCheckIn = async (passengerId: string) => {
    if (!verifiedIds[passengerId]) return;

    setCheckingInId(passengerId);
    try {
      const success = await onCheckIn(passengerId, true);
      if (success) {
        setCheckedInIds((prev) => ({
          ...prev,
          [passengerId]: true,
        }));
      }
    } finally {
      setCheckingInId(null);
    }
  };

  return (
    <div className="bg-white border-2 border-[#A7F3D0] rounded-xl p-5 md:p-6 space-y-5 shadow-xs">
      {/* Status Signal Header */}
      <div className="flex items-center justify-between border-b border-[#ECFDF5] pb-3">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#ECFDF5] text-brand-green flex items-center justify-center font-bold text-sm">
            ✓
          </span>
          <span className="text-lg font-bold text-[#064E3B]">
            Valid Ticket
          </span>
          <Badge variant="success">Confirmed Reservation</Badge>
        </div>
        <Button variant="neutral" size="sm" onClick={onClose}>
          ✕ Close
        </Button>
      </div>

      {/* Booking Overview Card */}
      <div className="bg-[#F8FAF9] border border-[#E3E8E5] rounded-xl p-4 space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-[#87918B] uppercase font-bold text-[10px]">Reference</span>
          <span className="font-mono font-bold text-sm text-[#0A0A0A]">
            {booking.reference}
          </span>
        </div>
        <div className="flex items-center justify-between font-semibold text-[#171717]">
          <span>{booking.route}</span>
          <span className="font-mono font-bold text-brand-green">{booking.departureTime}</span>
        </div>
        <div className="flex items-center justify-between text-[#66706A]">
          <span>{booking.departureDate}</span>
          <span>{booking.partySize} {booking.partySize === 1 ? "passenger" : "passengers"}</span>
        </div>
        {booking.vehicle && (
          <div className="text-[11px] font-mono text-[#171717] pt-1 border-t border-[#E3E8E5]">
            Vehicle: {booking.vehicle}
          </div>
        )}
      </div>

      {/* Group Passenger Roster (Requirements 23, 24, 25) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-brand-green uppercase tracking-wider">
            Traveler Identity & Check-In ({displayPassengers.length})
          </div>
          {allCheckedIn && (
            <Badge variant="success">All Passengers Checked In</Badge>
          )}
        </div>

        <div className="divide-y divide-[#E3E8E5] border border-[#E3E8E5] rounded-xl overflow-hidden">
          {displayPassengers.map((p, idx) => {
            const isCheckedIn = p.checkInStatus === "CHECKED_IN";
            const isProcessing = checkingInId === p.id;
            const isPhysicallyVerified = !!verifiedIds[p.id];

            return (
              <div
                key={p.id}
                className={`p-4 transition-colors ${
                  isCheckedIn ? "bg-[#ECFDF5]/30" : "bg-white"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Passenger Identity Info */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#66706A]">
                        #{idx + 1}
                      </span>
                      <span className="font-bold text-sm text-[#0A0A0A]">
                        {p.fullName}
                      </span>
                      {isCheckedIn ? (
                        <span className="text-[11px] font-semibold text-[#1E40AF] bg-[#EFF6FF] px-2 py-0.5 rounded-full border border-[#BFDBFE] inline-flex items-center gap-1">
                          ✓ Already checked in
                        </span>
                      ) : p.checkInStatus === "NO_SHOW" ? (
                        <span className="text-[11px] font-semibold text-[#991B1B] bg-[#FEF2F2] px-2 py-0.5 rounded-full border border-[#FECACA]">
                          No-show
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-[#D97706] bg-[#FFFBEB] px-2 py-0.5 rounded-full border border-[#FDE68A]">
                          Waiting at Gate
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-[#66706A] flex items-center gap-2 font-mono">
                      <span>{p.identityType.replace("_", " ")}:</span>
                      <span className="font-bold text-[#171717]">
                        {p.identityNumber}
                      </span>
                    </div>

                    {p.isTarget && !isCheckedIn && (
                      <span className="text-[10px] text-brand-green font-semibold">
                        ★ Scanned Pass Holder
                      </span>
                    )}
                  </div>

                  {/* Individual Check-In Action with Physical ID Verification Checkbox */}
                  <div className="flex flex-col sm:items-end gap-2 pt-2 sm:pt-0 border-t sm:border-0 border-[#F3F6F4]">
                    {!isCheckedIn ? (
                      <div className="space-y-2 w-full sm:w-auto">
                        <label className="flex items-center gap-2 text-xs text-[#171717] cursor-pointer font-medium">
                          <input
                            type="checkbox"
                            checked={isPhysicallyVerified}
                            onChange={() => toggleVerified(p.id)}
                            className="w-4 h-4 rounded text-brand-green focus:ring-brand-green border-[#E3E8E5]"
                          />
                          <span>Physical ID verified</span>
                        </label>

                        <Button
                          size="sm"
                          disabled={!isPhysicallyVerified || isProcessing}
                          aria-busy={isProcessing || undefined}
                          onClick={() => handlePassengerCheckIn(p.id)}
                          className="w-full sm:w-auto font-bold shadow-xs text-xs"
                        >
                          {isProcessing ? "Checking in…" : "Confirm ID & Check In"}
                        </Button>
                      </div>
                    ) : (
                      <div className="text-right">
                        <span className="text-[11px] font-mono text-[#065F46] bg-[#ECFDF5] px-2.5 py-1 rounded border border-[#A7F3D0]">
                          Boarded
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Done & Scan Next Action */}
      <div className="pt-2 flex items-center justify-between border-t border-[#ECFDF5]">
        <Button variant="neutral" size="default" onClick={onClose} className="font-semibold text-xs">
          ← Close & Scan Next Ticket
        </Button>
        <span className="text-xs text-[#66706A] font-mono">
          {displayPassengers.filter((p) => p.checkInStatus === "CHECKED_IN").length} of {displayPassengers.length} boarded
        </span>
      </div>
    </div>
  );
}
