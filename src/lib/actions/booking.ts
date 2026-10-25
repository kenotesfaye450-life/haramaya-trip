"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { requireAccount } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { ACTIVE_BOOKING_STATUSES, IDENTITY_TYPES, type IdentityType } from "@/lib/constants";
import { randomBookingReference, randomToken, sha256 } from "@/lib/crypto";
import { db, orm } from "@/lib/db";
import { AppError, formatErrorResponse } from "@/lib/errors";
import { newPublicCode } from "@/lib/tickets";
import { releaseExpiredBookings } from "@/lib/booking-expiry";

const PROOF_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const MAX_PROOF_BYTES = 5 * 1024 * 1024;

function readString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function isIdentityType(value: string): value is IdentityType {
  return (IDENTITY_TYPES as readonly string[]).includes(value);
}

function isRedirectError(error: unknown) {
  return typeof error === "object" && error !== null && "digest" in error;
}

export async function createBookingAction(_: unknown, formData: FormData) {
  const account = await requireAccount();
  try {
    // Release any expired holds first to free capacity
    await releaseExpiredBookings();

    const tripId = readString(formData, "tripId");
    const names = formData.getAll("fullName").map((value) => String(value).trim());
    const phones = formData.getAll("phone").map((value) => String(value).trim());
    const identityTypes = formData.getAll("identityType").map((value) => String(value).trim());
    const identityNumbers = formData.getAll("identityNumber").map((value) => String(value).trim());
    if (names.length === 0) throw new AppError("Add at least one passenger.");
    const passengers = names.map((fullName, index) => {
      if (fullName.length < 3) throw new AppError("Each passenger needs a full name.");
      const identityType = identityTypes[index] ?? "";
      const identityNumber = identityNumbers[index] ?? "";
      if (!isIdentityType(identityType)) throw new AppError("Select an identity document type.");
      if (identityNumber.length < 3) throw new AppError("Each passenger needs an identity number.");
      return {
        fullName,
        phone: phones[index] || null,
        identityType,
        identityNumber,
      };
    });

    const booking = await db.transaction(async (tx) => {
      const trip = await tx.orm.public.Trip.where({ id: tripId }).forUpdate().first();
      if (!trip) throw new AppError("Trip not found.");
      if (trip.status !== "PUBLISHED") throw new AppError("This trip is not open for booking.");
      const available = trip.seatCapacity - trip.seatsReserved;
      if (passengers.length > available) {
        throw new AppError(`Only ${available} seat${available === 1 ? "" : "s"} remain on this trip.`);
      }

      let reference = randomBookingReference();
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const clash = await tx.orm.public.Booking.where({ reference }).first();
        if (!clash) break;
        reference = randomBookingReference();
      }

      const created = await tx.orm.public.Booking.create({
        reference,
        accountId: account.id,
        tripId: trip.id,
        partySize: passengers.length,
        status: "PENDING_PAYMENT",
        paymentStatus: "UNPAID",
        rejectionReason: null,
        reviewedById: null,
        reviewedAt: null,
      });

      await tx.orm.public.Passenger.createAll(
        passengers.map((passenger) => ({
          bookingId: created.id,
          recordedById: account.id,
          fullName: passenger.fullName,
          phone: passenger.phone,
          identityType: passenger.identityType,
          identityNumber: passenger.identityNumber,
          checkInStatus: "NOT_CHECKED",
          checkedInAt: null,
          checkedInById: null,
        })),
      );

      await tx.orm.public.Trip.where({ id: trip.id }).update({
        seatsReserved: trip.seatsReserved + passengers.length,
      });

      return created;
    });

    await writeAudit({
      actorId: account.id,
      action: "booking.create",
      entityType: "Booking",
      entityId: booking.id,
      detail: `${booking.reference} (${passengers.length} passengers)`,
    });
    revalidatePath("/trips");
    revalidatePath("/bookings");
    redirect(`/bookings/${booking.id}`);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const formatted = formatErrorResponse(error);
    return { error: formatted.error };
  }
}

export async function cancelBookingAction(bookingId: string) {
  const account = await requireAccount();
  try {
    await db.transaction(async (tx) => {
      const booking = await tx.orm.public.Booking.where({ id: bookingId }).forUpdate().first();
      if (!booking) throw new AppError("Booking not found.");
      if (booking.accountId !== account.id && account.role !== "ADMIN") {
        throw new AppError("You cannot cancel this booking.");
      }
      if (booking.status === "CANCELLED") return;

      const trip = await tx.orm.public.Trip.where({ id: booking.tripId }).forUpdate().first();
      if (!trip) throw new AppError("Trip not found.");

      // Enforce 12-hour cancellation cutoff for travelers (Requirement 36)
      if (account.role !== "ADMIN") {
        const departureTime = new Date(trip.departureAt).getTime();
        const now = Date.now();
        const hoursRemaining = (departureTime - now) / (1000 * 60 * 60);
        if (hoursRemaining < 12) {
          throw new AppError("Cancellations are only permitted at least 12 hours prior to scheduled departure.");
        }
      }

      // Invalidate tickets if issued
      const tickets = await tx.orm.public.Ticket.where({ bookingId: booking.id }).all();
      for (const t of tickets) {
        await tx.orm.public.Ticket.where({ id: t.id }).delete();
      }

      // Safely release allocated seats if booking was active
      if (ACTIVE_BOOKING_STATUSES.includes(booking.status as (typeof ACTIVE_BOOKING_STATUSES)[number])) {
        await tx.orm.public.Trip.where({ id: trip.id }).update({
          seatsReserved: Math.max(0, trip.seatsReserved - booking.partySize),
        });
      }

      const isRefundRelevant = booking.paymentStatus === "APPROVED";
      await tx.orm.public.Booking.where({ id: booking.id }).update({
        status: "CANCELLED",
        rejectionReason: isRefundRelevant
          ? "REFUND_REQUESTED: Booking cancelled by traveler. Please visit University Transport Office for refund disbursement."
          : "Cancelled by traveler.",
      });
    });

    await writeAudit({
      actorId: account.id,
      action: "booking.cancel",
      entityType: "Booking",
      entityId: bookingId,
      detail: `Cancelled booking ${bookingId} and released capacity.`,
    });
  } catch (error) {
    const formatted = formatErrorResponse(error);
    return { error: formatted.error };
  }
  revalidatePath("/bookings");
  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/admin/bookings");
}

export async function submitPaymentProofAction(_: unknown, formData: FormData) {
  const account = await requireAccount();
  try {
    const bookingId = readString(formData, "bookingId");
    const note = readString(formData, "note");
    const file = formData.get("proof");
    if (!(file instanceof File) || file.size === 0) {
      throw new AppError("Attach a payment proof image or PDF.");
    }
    if (file.size > MAX_PROOF_BYTES) throw new AppError("Payment proof must be 5 MB or smaller.");
    if (!PROOF_TYPES.has(file.type)) {
      throw new AppError("Upload a JPEG, PNG, WebP, or PDF file.");
    }
    const booking = await orm.Booking.where({ id: bookingId }).first();
    if (!booking) throw new AppError("Booking not found.");
    if (booking.accountId !== account.id && account.role !== "ADMIN") {
      throw new AppError("You cannot update this booking.");
    }
    if (
      booking.status !== "PENDING_PAYMENT" &&
      booking.status !== "REJECTED" &&
      booking.status !== "PENDING_REVIEW"
    ) {
      throw new AppError("Payment proof cannot be submitted for this booking.");
    }

    const storageKey = `${booking.id}/${randomToken(12)}-${file.name.replaceAll(/[^a-zA-Z0-9._-]/g, "_")}`;
    await mkdir(path.join(process.cwd(), "storage", "proofs", booking.id), { recursive: true });
    await writeFile(
      path.join(process.cwd(), "storage", "proofs", storageKey),
      Buffer.from(await file.arrayBuffer()),
    );

    await orm.PaymentProof.create({
      bookingId: booking.id,
      uploadedById: account.id,
      fileName: file.name,
      mimeType: file.type,
      storageKey,
      note: note || null,
    });
    await orm.Booking.where({ id: booking.id }).update({
      status: "PENDING_REVIEW",
      paymentStatus: "SUBMITTED",
      rejectionReason: null,
    });
    await writeAudit({
      actorId: account.id,
      action: "payment.submit",
      entityType: "Booking",
      entityId: booking.id,
    });
  } catch (error) {
    const formatted = formatErrorResponse(error);
    return { error: formatted.error };
  }
  revalidatePath("/bookings");
  revalidatePath("/admin/payments");
  return { ok: true };
}

export async function reviewPaymentAction(_: unknown, formData: FormData) {
  const account = await requireAccount();
  if (account.role !== "ADMIN") {
    return { error: "Only administrators can review payments." };
  }
  const bookingId = readString(formData, "bookingId");
  const decision = readString(formData, "decision");
  const reason = readString(formData, "reason");
  try {
    await db.transaction(async (tx) => {
      const booking = await tx.orm.public.Booking.where({ id: bookingId }).forUpdate().first();
      if (!booking) throw new AppError("Booking not found.");
      if (booking.status !== "PENDING_REVIEW") {
        throw new AppError("This booking is not waiting for payment review.");
      }
      if (decision === "reject") {
        if (reason.length < 5) throw new AppError("Record a rejection reason.");
        const trip = await tx.orm.public.Trip.where({ id: booking.tripId }).forUpdate().first();
        if (trip) {
          await tx.orm.public.Trip.where({ id: trip.id }).update({
            seatsReserved: Math.max(0, trip.seatsReserved - booking.partySize),
          });
        }
        await tx.orm.public.Booking.where({ id: booking.id }).update({
          status: "REJECTED",
          paymentStatus: "REJECTED",
          rejectionReason: reason,
          reviewedById: account.id,
          reviewedAt: new Date().toISOString(),
        });
        return;
      }
      if (decision !== "approve") throw new AppError("Choose approve or reject.");
      const passengers = await tx.orm.public.Passenger.where({ bookingId: booking.id }).all();
      await tx.orm.public.Booking.where({ id: booking.id }).update({
        status: "CONFIRMED",
        paymentStatus: "APPROVED",
        rejectionReason: null,
        reviewedById: account.id,
        reviewedAt: new Date().toISOString(),
      });
      await tx.orm.public.Ticket.createAll(
        passengers.map((passenger) => ({
          bookingId: booking.id,
          passengerId: passenger.id,
          issuedById: account.id,
          publicCode: newPublicCode(),
          tokenHash: sha256(`${booking.id}:${passenger.id}:${randomToken(16)}`),
        })),
      );
    });
    await writeAudit({
      actorId: account.id,
      action: decision === "approve" ? "payment.approve" : "payment.reject",
      entityType: "Booking",
      entityId: bookingId,
      detail: reason || null,
    });
  } catch (error) {
    const formatted = formatErrorResponse(error);
    return { error: formatted.error };
  }
  revalidatePath("/admin/payments");
  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/admin/bookings");
  return { ok: true };
}
