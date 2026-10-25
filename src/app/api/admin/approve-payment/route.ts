import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { newPublicCode, sha256 } from "@/lib/tickets";
import { AppError, formatErrorResponse } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const account = await getCurrentAccount();
    if (!account || account.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { bookingId } = await request.json();
    if (!bookingId) {
      return NextResponse.json({ error: "Booking ID is required" }, { status: 400 });
    }

    await db.transaction(async (tx) => {
      const booking = await tx.orm.public.Booking.where({ id: String(bookingId) }).forUpdate().first();
      if (!booking) throw new AppError("Booking not found.");
      if (booking.status !== "PENDING_REVIEW" || booking.paymentStatus !== "SUBMITTED") {
        throw new AppError("This booking is not awaiting payment review.");
      }

      const passengers = await tx.orm.public.Passenger.where({ bookingId: booking.id }).include("ticket").all();
      await tx.orm.public.Booking.where({ id: booking.id }).update({
        status: "CONFIRMED",
        paymentStatus: "APPROVED",
        rejectionReason: null,
        reviewedById: account.id,
        reviewedAt: new Date().toISOString(),
      });

      for (const passenger of passengers) {
        if (!passenger.ticket) {
          const publicCode = newPublicCode();
          await tx.orm.public.Ticket.create({
            bookingId: booking.id,
            passengerId: passenger.id,
            issuedById: account.id,
            publicCode,
            tokenHash: sha256(`${publicCode}.${passenger.id}`),
          });
        }
      }
    });

    await writeAudit({
      actorId: account.id,
      action: "payment.approve",
      entityType: "Booking",
      entityId: bookingId,
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
