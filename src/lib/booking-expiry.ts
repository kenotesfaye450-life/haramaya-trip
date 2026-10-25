import { db, orm } from "@/lib/db";

/**
 * Releases expired seat holds and unpaid reservations.
 *
 * Rules:
 * - Temporary seat hold: 10 minutes without submitted proof.
 * - Global payment deadline: 30 minutes after booking creation.
 * - Safely returns held capacity to the scheduled trip.
 * - Atomic database transaction with .forUpdate().
 */
export async function releaseExpiredBookings(): Promise<number> {
  const now = Date.now();
  const TEN_MINUTES_MS = 10 * 60 * 1000;
  const THIRTY_MINUTES_MS = 30 * 60 * 1000;

  try {
    // Query active unpaid pending bookings
    const pendingBookings = await orm.Booking.where({
      status: "PENDING_PAYMENT",
      paymentStatus: "UNPAID",
    })
      .include("proofs")
      .all();

    let releasedCount = 0;

    for (const b of pendingBookings) {
      const createdTime = new Date(b.createdAt).getTime();
      const hasProof = (b.proofs && b.proofs.length > 0);
      const expiryWindow = hasProof ? THIRTY_MINUTES_MS : TEN_MINUTES_MS;

      if (now - createdTime > expiryWindow) {
        await db.transaction(async (tx) => {
          const lockedBooking = await tx.orm.public.Booking.where({ id: b.id })
            .forUpdate()
            .first();

          if (!lockedBooking || lockedBooking.status !== "PENDING_PAYMENT") {
            return;
          }

          // Release trip reserved capacity safely
          const trip = await tx.orm.public.Trip.where({ id: lockedBooking.tripId })
            .forUpdate()
            .first();

          if (trip) {
            await tx.orm.public.Trip.where({ id: trip.id }).update({
              seatsReserved: Math.max(0, trip.seatsReserved - lockedBooking.partySize),
            });
          }

          // Invalidate booking
          await tx.orm.public.Booking.where({ id: lockedBooking.id }).update({
            status: "CANCELLED",
            rejectionReason: hasProof
              ? "EXPIRED: 30-minute payment deadline exceeded."
              : "EXPIRED: 10-minute temporary seat hold elapsed.",
          });

          // Retain audit event
          await tx.orm.public.AuditEvent.create({
            actorId: null,
            action: "booking.expire_hold",
            entityType: "Booking",
            entityId: lockedBooking.id,
            detail: `Released ${lockedBooking.partySize} held seats for trip ${lockedBooking.tripId} due to hold expiry.`,
          });

          releasedCount += 1;
        });
      }
    }

    return releasedCount;
  } catch (error) {
    console.error("Error in releaseExpiredBookings:", error);
    return 0;
  }
}
