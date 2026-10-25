import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { AppError, formatErrorResponse } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const account = await getCurrentAccount();
    if (!account || account.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { bookingId, reason } = await request.json();

    if (!bookingId || typeof reason !== "string" || reason.trim().length < 5) {
      return NextResponse.json(
        { error: "Enter a rejection reason of at least 5 characters." },
        { status: 400 }
      );
    }

    await db.transaction(async (tx) => {
      const booking = await tx.orm.public.Booking.where({ id: String(bookingId) }).forUpdate().first();
      if (!booking) throw new AppError("Booking not found.");
      if (booking.status !== "PENDING_REVIEW" || booking.paymentStatus !== "SUBMITTED") {
        throw new AppError("This booking is not awaiting payment review.");
      }

      const trip = await tx.orm.public.Trip.where({ id: booking.tripId }).forUpdate().first();
      if (!trip) throw new AppError("Trip not found.");
      await tx.orm.public.Trip.where({ id: trip.id }).update({
        seatsReserved: Math.max(0, trip.seatsReserved - booking.partySize),
      });
      await tx.orm.public.Booking.where({ id: booking.id }).update({
        status: "REJECTED",
        paymentStatus: "REJECTED",
        rejectionReason: reason.trim(),
        reviewedById: account.id,
        reviewedAt: new Date().toISOString(),
      });
    });

    await writeAudit({
      actorId: account.id,
      action: "payment.reject",
      entityType: "Booking",
      entityId: bookingId,
      detail: reason.trim(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const formatted = formatErrorResponse(error);
    return NextResponse.json(
      { error: formatted.error },
      { status: formatted.statusCode }
    );
  }
}
