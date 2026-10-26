import "server-only";

import { db, orm } from "@/lib/db";
import type { SessionAccount } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import {
  createPaymentProofStorageKey,
  deletePaymentProofObject,
  uploadPaymentProofObject,
} from "@/lib/payment-proof-storage";

const MAX_PROOF_BYTES = 5 * 1024 * 1024;
const ALLOWED_PROOF_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const TEN_MINUTES_MS = 10 * 60 * 1000;
const THIRTY_MINUTES_MS = 30 * 60 * 1000;

function validateProofFile(file: File) {
  if (!file.size) throw new AppError("Attach a payment proof image.");
  if (file.size > MAX_PROOF_BYTES) {
    throw new AppError("Payment proof must be 5 MB or smaller.", 413);
  }
  if (!ALLOWED_PROOF_TYPES.has(file.type)) {
    throw new AppError("Upload a JPEG, PNG, or WebP image.", 415);
  }
}

function validateProofSignature(contents: Buffer, mimeType: string) {
  const matches =
    (mimeType === "image/jpeg" &&
      contents.length >= 3 &&
      contents[0] === 0xff &&
      contents[1] === 0xd8 &&
      contents[2] === 0xff) ||
    (mimeType === "image/png" &&
      contents.length >= 8 &&
      contents.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) ||
    (mimeType === "image/webp" &&
      contents.length >= 12 &&
      contents.toString("ascii", 0, 4) === "RIFF" &&
      contents.toString("ascii", 8, 12) === "WEBP");

  if (!matches) {
    throw new AppError("The file contents do not match the selected image format.", 415);
  }
}

function assertAuthorizedOwner(account: SessionAccount, bookingAccountId: string) {
  if (account.role === "ADMIN") return;
  if (account.role !== "TRAVELER" || bookingAccountId !== account.id) {
    throw new AppError("You cannot submit payment proof for this booking.", 403);
  }
}

function assertBookingAcceptsProof(
  booking: { status: string; paymentStatus: string; createdAt: string | Date },
  proofCount: number,
) {
  const validState =
    (booking.status === "PENDING_PAYMENT" && booking.paymentStatus === "UNPAID") ||
    (booking.status === "REJECTED" && booking.paymentStatus === "REJECTED");
  if (!validState) {
    throw new AppError("Payment proof cannot be submitted for this booking state.", 409);
  }

  const createdAt = new Date(booking.createdAt).getTime();
  const paymentWindow = proofCount > 0 ? THIRTY_MINUTES_MS : TEN_MINUTES_MS;
  if (!Number.isFinite(createdAt) || Date.now() - createdAt > paymentWindow) {
    throw new AppError("The payment deadline for this booking has passed.", 409);
  }
}

function safeFileName(fileName: string) {
  return fileName.replace(/[\r\n\0]/g, "_").slice(0, 255) || "payment-proof";
}

export async function submitPaymentProof(
  account: SessionAccount,
  bookingId: string,
  file: File,
  note?: string,
) {
  if (!bookingId || bookingId.length > 128) {
    throw new AppError("A valid booking ID is required.", 400);
  }
  if (note && note.length > 1000) throw new AppError("The payment note is too long.", 400);
  validateProofFile(file);

  const initialBooking = await orm.Booking.where({ id: bookingId }).first();
  if (!initialBooking) throw new AppError("Booking not found.", 404);
  assertAuthorizedOwner(account, initialBooking.accountId);
  const initialProofs = await orm.PaymentProof.where({ bookingId }).all();
  assertBookingAcceptsProof(initialBooking, initialProofs.length);

  const contents = Buffer.from(await file.arrayBuffer());
  if (contents.length !== file.size) throw new AppError("The uploaded file is incomplete.", 400);
  validateProofSignature(contents, file.type);

  const storageKey = createPaymentProofStorageKey(bookingId, file.type);
  await uploadPaymentProofObject(storageKey, contents, file.type);

  try {
    const updatedBooking = await db.transaction(async (tx) => {
      const booking = await tx.orm.public.Booking.where({ id: bookingId }).forUpdate().first();
      if (!booking) throw new AppError("Booking not found.", 404);
      assertAuthorizedOwner(account, booking.accountId);

      const proofs = await tx.orm.public.PaymentProof.where({ bookingId }).all();
      assertBookingAcceptsProof(booking, proofs.length);

      if (booking.status === "REJECTED") {
        const trip = await tx.orm.public.Trip.where({ id: booking.tripId }).forUpdate().first();
        if (!trip || trip.status !== "PUBLISHED") {
          throw new AppError("This trip is no longer accepting replacement payment proofs.", 409);
        }
        const availableSeats = trip.seatCapacity - trip.seatsReserved;
        if (availableSeats < booking.partySize) {
          throw new AppError("There are no longer enough seats available for this booking.", 409);
        }
        await tx.orm.public.Trip.where({ id: trip.id }).update({
          seatsReserved: trip.seatsReserved + booking.partySize,
        });
      }

      await tx.orm.public.PaymentProof.create({
        bookingId,
        uploadedById: account.id,
        fileName: safeFileName(file.name),
        mimeType: file.type,
        storageKey,
        note: note?.trim() || null,
      });
      await tx.orm.public.Booking.where({ id: bookingId }).update({
        status: "PENDING_REVIEW",
        paymentStatus: "SUBMITTED",
        rejectionReason: null,
      });
      await tx.orm.public.AuditEvent.create({
        actorId: account.id,
        action: "payment.proof_uploaded",
        entityType: "Booking",
        entityId: bookingId,
        detail: `Payment proof submitted (${file.type}, ${file.size} bytes).`,
      });

      return {
        id: booking.id,
        reference: booking.reference,
        status: "PENDING_REVIEW" as const,
        paymentStatus: "SUBMITTED" as const,
      };
    });

    return updatedBooking;
  } catch (error) {
    try {
      await deletePaymentProofObject(storageKey);
    } catch {
      console.error("A payment proof object could not be removed after a database failure.");
    }
    throw error;
  }
}
