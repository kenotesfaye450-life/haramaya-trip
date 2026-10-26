import { NextRequest, NextResponse } from 'next/server';
import { db, orm } from '@/lib/db';
import { getCurrentAccount } from '@/lib/auth';
import { validatePassengerDetails } from '@/lib/validation';
import { generateBookingReference } from '@/lib/security';
import { ValidationError, ConflictError, NotFoundError, formatErrorResponse, logError } from '@/lib/errors';
import { releaseExpiredBookings } from '@/lib/booking-expiry';
import type { IdentityType } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const account = await getCurrentAccount();
    if (!account) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tripId, passengers } = body;

    // Validation
    if (!tripId) {
      throw new ValidationError('Trip ID is required');
    }

    if (!Array.isArray(passengers) || passengers.length === 0) {
      throw new ValidationError('At least one passenger is required');
    }

    if (passengers.length > 200) {
      throw new ValidationError('Passenger count exceeds single transaction technical limit (200). For large fleet charters, please submit a travel demand request.');
    }

    // Validate each passenger
    for (let i = 0; i < passengers.length; i++) {
      const validation = validatePassengerDetails(passengers[i]);
      if (!validation.valid) {
        throw new ValidationError(
          `Passenger ${i + 1} validation failed`,
          validation.errors
        );
      }
    }

    const seatsNeeded = passengers.length;

    // Release any expired holds before evaluating capacity
    await releaseExpiredBookings();

    // Concurrency-safe capacity reservation in a transaction with .forUpdate()
    const booking = await db.transaction(async (tx) => {
      const trip = await tx.orm.public.Trip.where({ id: tripId }).forUpdate().first();

      if (!trip) {
        throw new NotFoundError('Trip');
      }

      if (trip.status !== 'PUBLISHED') {
        throw new ValidationError('Trip is not open for booking');
      }

      const availableSeats = trip.seatCapacity - trip.seatsReserved;
      if (availableSeats < seatsNeeded) {
        throw new ConflictError(
          `Insufficient seats. ${availableSeats} available, ${seatsNeeded} requested`
        );
      }

      let reference = generateBookingReference();
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const clash = await tx.orm.public.Booking.where({ reference }).first();
        if (!clash) break;
        reference = generateBookingReference();
      }

      const created = await tx.orm.public.Booking.create({
        reference,
        accountId: account.id,
        tripId,
        partySize: seatsNeeded,
        status: 'PENDING_PAYMENT',
        paymentStatus: 'UNPAID',
        rejectionReason: null,
        reviewedById: null,
        reviewedAt: null,
      });

      await tx.orm.public.Passenger.createAll(
        passengers.map((passengerData: { fullName: string; phone?: string; identityType: IdentityType; identityNumber: string }) => ({
          bookingId: created.id,
          recordedById: account.id,
          fullName: passengerData.fullName.trim(),
          phone: passengerData.phone ? passengerData.phone.trim() : null,
          identityType: passengerData.identityType,
          identityNumber: passengerData.identityNumber.trim(),
          checkInStatus: 'NOT_CHECKED' as const,
          checkedInAt: null,
          checkedInById: null,
        }))
      );

      await tx.orm.public.Trip.where({ id: tripId }).update({
        seatsReserved: trip.seatsReserved + seatsNeeded,
      });

      await tx.orm.public.AuditEvent.create({
        actorId: account.id,
        action: 'booking.create',
        entityType: 'Booking',
        entityId: created.id,
        detail: `${seatsNeeded} seats reserved for trip ${tripId}`,
      });

      return created;
    });

    // Reload with relations
    const fullBooking = await orm.Booking.where({ id: booking.id })
      .include('passengers')
      .include('trip', (t) =>
        t.include('route', (r) =>
          r.include('originLocation').include('destinationLocation')
        )
      )
      .first();

    return NextResponse.json(
      {
        success: true,
        bookingId: booking.id,
        booking: fullBooking,
      },
      { status: 201 }
    );
  } catch (error) {
    logError(error, { route: '/api/bookings/create' });
    const formattedError = formatErrorResponse(error);
    return NextResponse.json(
      { error: formattedError.error, details: formattedError.details },
      { status: formattedError.statusCode }
    );
  }
}
