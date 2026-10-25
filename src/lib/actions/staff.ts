"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { orm } from "@/lib/db";
import { AppError, formatErrorResponse } from "@/lib/errors";
import { decodeTicketPayload } from "@/lib/tickets";

export type VerificationResult = {
  error?: string;
  ticketId?: string;
};

export async function verifyTicketAction(_: unknown, formData: FormData): Promise<VerificationResult> {
  await requireRole("STAFF", "ADMIN");
  const raw = String(formData.get("code") ?? "").trim();
  if (!raw) return { error: "Enter a ticket code or scan a QR payload." };
  try {
    const payload = decodeTicketPayload(raw);
    if (payload) {
      const ticket = await orm.Ticket.where({ id: payload.ticketId }).first();
      if (!ticket || ticket.passengerId !== payload.passengerId) {
        throw new AppError("Ticket signature is valid, but no matching ticket exists.");
      }
      return { ticketId: ticket.id };
    }
    const ticket = await orm.Ticket.where({ publicCode: raw.toUpperCase() }).first();
    if (!ticket) throw new AppError("No ticket matched that backup code.");
    return { ticketId: ticket.id };
  } catch (error) {
    const formatted = formatErrorResponse(error);
    return { error: formatted.error };
  }
}

export async function setPassengerCheckInAction(passengerId: string, status: "CHECKED_IN" | "NO_SHOW") {
  const account = await requireRole("STAFF", "ADMIN");
  try {
    const passenger = await orm.Passenger.where({ id: passengerId }).include("booking").first();
    if (!passenger) throw new AppError("Passenger not found.");
    if (passenger.booking.status !== "CONFIRMED") {
      throw new AppError("Only confirmed bookings can be checked in.");
    }
    await orm.Passenger.where({ id: passenger.id }).update({
      checkInStatus: status,
      checkedInAt: new Date().toISOString(),
      checkedInById: account.id,
    });
    await writeAudit({
      actorId: account.id,
      action: status === "CHECKED_IN" ? "passenger.checkin" : "passenger.noshow",
      entityType: "Passenger",
      entityId: passenger.id,
      detail: passenger.booking.reference,
    });
  } catch (error) {
    const formatted = formatErrorResponse(error);
    return { error: formatted.error };
  }
  revalidatePath("/staff");
  return { ok: true };
}
