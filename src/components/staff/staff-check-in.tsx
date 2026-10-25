'use client';

import { useState, useEffect } from 'react';
import { QRScanner } from './qr-scanner';
import { TicketVerification, type VerifiedBooking, type VerifiedPassenger } from './ticket-verification';
import { Alert } from '@/components/ui/alert';

interface TripInfo {
  id: string;
  date: string;
  route: string;
  departureTime: string;
  vehicle: string;
  capacity: number;
  checkedIn: number;
  pending: number;
}

export function StaffCheckIn({ tripId }: { tripId: string }) {
  const [tripInfo, setTripInfo] = useState<TripInfo | null>(null);
  const [booking, setBooking] = useState<VerifiedBooking | null>(null);
  const [passengers, setPassengers] = useState<VerifiedPassenger[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [checkedInCount, setCheckedInCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function fetchTrip() {
      try {
        const response = await fetch(`/api/staff/trips/${tripId}`);
        if (!response.ok) {
          throw new Error('Failed to load trip information');
        }
        const data = await response.json();
        if (!ignore && data.trip) {
          setTripInfo(data.trip);
          setCheckedInCount(data.trip.checkedIn || 0);
          setTotalCount(data.trip.capacity || 0);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Failed to load trip:', err);
        }
      }
    }
    fetchTrip();
    return () => {
      ignore = true;
    };
  }, [tripId]);

  const handleScanSuccess = async (qrData: string) => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setBooking(null);
    setPassengers([]);

    try {
      const response = await fetch('/api/staff/verify-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId, ticketCode: qrData }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid ticket code or unrecognized signature');
      }

      setBooking(data.booking);
      setPassengers(data.passengers || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to verify ticket';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (passengerId: string, identityVerified: boolean): Promise<boolean> => {
    if (!identityVerified) {
      setError('Physical ID verification required');
      return false;
    }

    try {
      const response = await fetch('/api/staff/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passengerId,
          tripId,
          identityVerified,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Check-in failed');
      }

      setCheckedInCount((prev) => prev + 1);
      setSuccessMessage(`${data.passenger?.fullName || 'Passenger'} checked in successfully`);
      setTimeout(() => setSuccessMessage(null), 4000);
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Check-in failed';
      setError(message);
      return false;
    }
  };

  const handleClose = () => {
    setBooking(null);
    setPassengers([]);
    setError(null);
  };

  return (
    <div className="max-w-xl mx-auto space-y-4">
      {/* Compact Operational Departure Ribbon */}
      {tripInfo && (
        <div className="bg-white border border-[#E3E8E5] rounded-xl px-4 py-3.5 flex items-center justify-between text-xs shadow-xs">
          <div>
            <div className="font-bold text-[#0A0A0A] text-sm">
              {tripInfo.departureTime} · {tripInfo.route}
            </div>
            <div className="text-[#66706A] font-mono mt-0.5">
              {tripInfo.vehicle ? `Vehicle: ${tripInfo.vehicle}` : 'Gate Active'}
            </div>
          </div>
          <div className="text-right">
            <span className="font-mono font-bold text-brand-green text-sm bg-[#ECFDF5] px-2.5 py-0.5 rounded-md border border-[#A7F3D0]">
              {checkedInCount} / {totalCount}
            </span>
            <div className="text-[#66706A] uppercase tracking-wider text-[10px] mt-1 font-semibold">
              Checked In
            </div>
          </div>
        </div>
      )}

      {/* Operational Feedback */}
      {successMessage && (
        <Alert variant="success" className="py-2.5">
          <span className="font-medium">{successMessage}</span>
        </Alert>
      )}

      {/* Main Scanner or Verification Result */}
      {!booking && !error && !loading ? (
        <QRScanner
          tripId={tripId}
          paused={loading || Boolean(booking) || Boolean(error)}
          onScanSuccess={handleScanSuccess}
        />
      ) : (
        <TicketVerification
          booking={booking}
          passengers={passengers}
          loading={loading}
          error={error}
          onCheckIn={handleCheckIn}
          onClose={handleClose}
        />
      )}
    </div>
  );
}
