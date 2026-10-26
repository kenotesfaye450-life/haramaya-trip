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
    const originLocationId = readString(formData, "originLocationId");
    const destinationLocationId = readString(formData, "destinationLocationId");
    const eventId = readString(formData, "eventId");
    const travelDate = readString(formData, "travelDate");
    const passengerCount = Number(readString(formData, "passengerCount"));
    const note = readString(formData, "note");
    if (!originLocationId || !destinationLocationId) {
      throw new AppError("Select an origin and destination.");
    }
    if (originLocationId === destinationLocationId) {
      throw new AppError("Origin and destination cannot be the same location.");
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(travelDate)) throw new AppError("Select a travel date.");
    if (!Number.isInteger(passengerCount) || passengerCount < 1) {
      throw new AppError("Passenger count must be at least 1.");
    }
    const [originLocation, destinationLocation] = await Promise.all([
      orm.Location.where({ id: originLocationId, isActive: true }).first(),
      orm.Location.where({ id: destinationLocationId, isActive: true }).first(),
    ]);
    if (!originLocation || !destinationLocation) throw new AppError("Select two active locations.");
    const route = await orm.Route.where({ originLocationId, destinationLocationId }).first();
    const created = await orm.DemandRequest.create({
      accountId: account.id,
      routeId: route?.id ?? null,
      originLocationId,
      destinationLocationId,
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
