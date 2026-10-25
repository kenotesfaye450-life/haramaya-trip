import { NextRequest, NextResponse } from 'next/server';
import { orm } from '@/lib/db';
import { getCurrentAccount } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ tripId: string }> }
) {
  try {
    const account = await getCurrentAccount();
    if (!account || (account.role !== 'STAFF' && account.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { tripId } = await context.params;

    const trip = await orm.Trip.where({ id: tripId })
      .include("route", r => r.include("originCampus").include("destination"))
      .include("vehicle")
      .first();

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    const bookings = await orm.Booking.where({
      tripId,
      status: 'CONFIRMED',
      paymentStatus: 'APPROVED',
    })
      .include("passengers")
      .all();

    // Calculate check-in statistics
    const allPassengers = bookings.flatMap((b) => b.passengers || []);
    const checkedIn = allPassengers.filter((p) => p.checkInStatus === 'CHECKED_IN').length;
    const pending = allPassengers.filter((p) => p.checkInStatus === 'NOT_CHECKED').length;

    return NextResponse.json({
      trip: {
        id: trip.id,
        departureAt: trip.departureAt,
        route: trip.route ? `${trip.route.originCampus?.name} → ${trip.route.destination?.name}` : 'Unknown route',
        vehicle: trip.vehicle?.name || 'TBA',
        capacity: trip.seatCapacity,
        checkedIn,
        pending,
      },
    });
  } catch (error) {
    console.error('Failed to load trip:', error);
    return NextResponse.json(
      { error: 'Failed to load trip information' },
      { status: 500 }
    );
  }
}
