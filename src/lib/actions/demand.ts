"use server";

import { revalidatePath } from "next/cache";
import { requireAccount } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { orm } from "@/lib/db";
import { AppError, formatErrorResponse } from "@/lib/errors";

function readString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function submitDemandAction(_: unknown, formData: FormData) {
  const account = await requireAccount();
  try {
    const routeId = readString(formData, "routeId");
    const eventId = readString(formData, "eventId");
    const travelDate = readString(formData, "travelDate");
    const passengerCount = Number(readString(formData, "passengerCount"));
    const note = readString(formData, "note");
    if (!routeId) throw new AppError("Select a route.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(travelDate)) throw new AppError("Select a travel date.");
    if (!Number.isInteger(passengerCount) || passengerCount < 1) {
      throw new AppError("Passenger count must be at least 1.");
    }
    const route = await orm.Route.where({ id: routeId, isActive: true }).first();
    if (!route) throw new AppError("Route not found.");
    const created = await orm.DemandRequest.create({
      accountId: account.id,
      routeId,
      eventId: eventId || null,
      travelDate,
      passengerCount,
      note: note || null,
      status: "OPEN",
    });
    await writeAudit({
      actorId: account.id,
      action: "demand.submit",
      entityType: "DemandRequest",
      entityId: created.id,
    });
  } catch (error) {
    const formatted = formatErrorResponse(error);
    return { error: formatted.error };
  }
  revalidatePath("/demand");
  revalidatePath("/admin/demand");
  return { ok: true };
}
