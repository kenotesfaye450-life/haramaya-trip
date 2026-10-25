import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentAccount } from '@/lib/auth';
import { writeAudit } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const account = await getCurrentAccount();
    if (!account || (account.role !== 'STAFF' && account.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { passengerId, tripId, identityVerified } = body;

    if (!passengerId || !tripId) {
      return NextResponse.json(
        { error: 'Passenger ID and trip ID are required' },
        { status: 400 }
      );
    }

    if (identityVerified !== true) {
      return NextResponse.json(
        { error: 'Identity verification is required before check-in' },
        { status: 400 }
      );
    }

    const passenger = await db.transaction(async (tx) => {
      const record = await tx.orm.public.Passenger.where({ id: String(passengerId) })
        .forUpdate()
        .include("booking")
        .first();
      if (!record || !record.booking) throw new Error('PASSENGER_NOT_FOUND');
      if (record.booking.tripId !== String(tripId)) throw new Error('TRIP_MISMATCH');
      if (record.booking.status !== 'CONFIRMED' || record.booking.paymentStatus !== 'APPROVED') {
        throw new Error('BOOKING_NOT_CONFIRMED');
      }
      if (record.checkInStatus === 'CHECKED_IN') throw new Error('ALREADY_CHECKED_IN');

      await tx.orm.public.Passenger.where({ id: record.id }).update({
        checkInStatus: 'CHECKED_IN',
        checkedInAt: new Date().toISOString(),
        checkedInById: account.id,
      });
      return record;
    });

    await writeAudit({
      actorId: account.id,
      action: 'passenger.check_in',
      entityType: 'Passenger',
      entityId: passengerId,
      detail: `Checked in passenger ${passenger.fullName} for trip ${tripId}`,
    });

    const updatedPassenger = await db.orm.public.Passenger.where({ id: String(passengerId) }).first();

    return NextResponse.json({
      success: true,
      passenger: {
        id: updatedPassenger?.id,
        fullName: updatedPassenger?.fullName,
        checkInStatus: updatedPassenger?.checkInStatus,
        checkedInAt: updatedPassenger?.checkedInAt,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      const knownErrors: Record<string, { status: number; message: string }> = {
        PASSENGER_NOT_FOUND: { status: 404, message: 'Passenger or booking not found.' },
        TRIP_MISMATCH: { status: 400, message: 'Passenger is not booked for this trip.' },
        BOOKING_NOT_CONFIRMED: { status: 400, message: 'Only confirmed, paid passengers can check in.' },
        ALREADY_CHECKED_IN: { status: 409, message: 'Passenger is already checked in.' },
      };
      const known = knownErrors[error.message];
      if (known) return NextResponse.json({ error: known.message }, { status: known.status });
    }
    return NextResponse.json(
      { error: 'Failed to check in passenger. Please try again.' },
      { status: 500 }
    );
  }
}
