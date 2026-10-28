"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { destroySession, requireRole } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { ROLES, type Role } from "@/lib/constants";
import { hashPassword } from "@/lib/crypto";
import { db, orm } from "@/lib/db";
import { AppError, formatErrorResponse } from "@/lib/errors";

function readString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function bool(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

async function admin() {
  return requireRole("ADMIN");
}

export async function saveLocationAction(_: unknown, formData: FormData) {
  const account = await admin();
  try {
    const id = readString(formData, "id");
    const name = readString(formData, "name");
    const code = readString(formData, "code").toUpperCase();
    const kind = readString(formData, "kind");
    if (!name || !/^[A-Z0-9_-]{2,12}$/.test(code)) {
      throw new AppError("Enter a location name and a code of 2–12 letters, numbers, or dashes.");
    }
    if (kind !== "CAMPUS" && kind !== "EXTERNAL") {
      throw new AppError("Select a valid location type.");
    }
    if (id) {
      await orm.Location.where({ id }).update({ name, code, kind, isActive: bool(formData, "isActive") });
    } else {
      await orm.Location.create({ name, code, kind, isActive: true });
    }
    await writeAudit({
      actorId: account.id,
      action: id ? "location.update" : "location.create",
      entityType: "Location",
      entityId: id || code,
    });
  } catch (error) {
    const formatted = formatErrorResponse(error);
    return { error: formatted.error };
  }
  revalidatePath("/admin/routes");
  revalidatePath("/");
  revalidatePath("/trips");
  return { ok: true };
}

export async function saveRouteAction(_: unknown, formData: FormData) {
  const account = await admin();
  try {
    const id = readString(formData, "id");
    const name = readString(formData, "name");
    const originLocationId = readString(formData, "originLocationId");
    const destinationLocationId = readString(formData, "destinationLocationId");
    if (!name || !originLocationId || !destinationLocationId) {
      throw new AppError("Route name, origin location, and destination are required.");
    }
    if (originLocationId === destinationLocationId) {
      throw new AppError("Origin and destination cannot be the same location.");
    }
    const [origin, destination] = await Promise.all([
      orm.Location.where({ id: originLocationId, isActive: true }).first(),
      orm.Location.where({ id: destinationLocationId, isActive: true }).first(),
    ]);
    if (!origin || !destination) throw new AppError("Select two active locations.");
    if (id) {
      await orm.Route.where({ id }).update({
        name,
        originLocationId,
        destinationLocationId,
        isActive: bool(formData, "isActive"),
      });
    } else {
      await orm.Route.create({ name, originLocationId, destinationLocationId, isActive: true });
    }
    await writeAudit({
      actorId: account.id,
      action: id ? "route.update" : "route.create",
      entityType: "Route",
      entityId: id || name,
    });
  } catch (error) {
    const formatted = formatErrorResponse(error);
    return { error: formatted.error };
  }
  revalidatePath("/admin/routes");
  return { ok: true };
}

export async function saveVehicleAction(_: unknown, formData: FormData) {
  const account = await admin();
  try {
    const id = readString(formData, "id");
    const name = readString(formData, "name");
    const plateNumber = readString(formData, "plateNumber").toUpperCase();
    const seatCapacity = Number(readString(formData, "seatCapacity"));
    if (!name || !plateNumber) throw new AppError("Vehicle name and plate number are required.");
    if (!Number.isInteger(seatCapacity) || seatCapacity < 1) {
      throw new AppError("Seat capacity must be a positive integer.");
    }
    if (id) {
      await orm.Vehicle.where({ id }).update({
        name,
        plateNumber,
        seatCapacity,
        isActive: bool(formData, "isActive"),
      });
    } else {
      await orm.Vehicle.create({ name, plateNumber, seatCapacity, isActive: true });
    }
    await writeAudit({
      actorId: account.id,
      action: id ? "vehicle.update" : "vehicle.create",
      entityType: "Vehicle",
      entityId: id || plateNumber,
    });
  } catch (error) {
    const formatted = formatErrorResponse(error);
    return { error: formatted.error };
  }
  revalidatePath("/admin/vehicles");
  return { ok: true };
}

export async function saveEventAction(_: unknown, formData: FormData) {
  const account = await admin();
  try {
    const id = readString(formData, "id");
    const name = readString(formData, "name");
    const description = readString(formData, "description");
    const startsOn = readString(formData, "startsOn");
    const endsOn = readString(formData, "endsOn");
    if (!name || !startsOn || !endsOn) throw new AppError("Event name and dates are required.");
    if (id) {
      await orm.TravelEvent.where({ id }).update({
        name,
        description: description || null,
        startsOn,
        endsOn,
        isActive: bool(formData, "isActive"),
      });
    } else {
      await orm.TravelEvent.create({
        name,
        description: description || null,
        startsOn,
        endsOn,
        isActive: true,
      });
    }
    await writeAudit({
      actorId: account.id,
      action: id ? "event.update" : "event.create",
      entityType: "TravelEvent",
      entityId: id || name,
    });
  } catch (error) {
    const formatted = formatErrorResponse(error);
    return { error: formatted.error };
  }
  revalidatePath("/admin/events");
  return { ok: true };
}

export async function saveTripPurposeAction(_: unknown, formData: FormData) {
  const account = await admin();
  try {
    const id = readString(formData, "id");
    const submittedCode = readString(formData, "code").toUpperCase();
    const name = readString(formData, "name");
    const description = readString(formData, "description");
    const existingPurpose = id ? await orm.TripPurpose.where({ id }).first() : null;
    if (id && !existingPurpose) throw new AppError("Trip purpose not found.");
    const code = existingPurpose?.code ?? submittedCode;
    if (!name || !/^[A-Z0-9_-]{2,40}$/.test(code)) {
      throw new AppError("Enter a purpose name and a code of 2–40 letters, numbers, or dashes.");
    }
    const values = { code, name, description: description || null };
    if (id) {
      await orm.TripPurpose.where({ id }).update({
        ...values,
        isActive: bool(formData, "isActive"),
      });
    } else {
      await orm.TripPurpose.create({ ...values, isActive: true });
    }
    await writeAudit({
      actorId: account.id,
      action: id ? "trip-purpose.update" : "trip-purpose.create",
      entityType: "TripPurpose",
      entityId: id || code,
    });
  } catch (error) {
    const formatted = formatErrorResponse(error);
    return { error: formatted.error };
  }
  revalidatePath("/admin/events");
  revalidatePath("/admin/trips");
  return { ok: true };
}

export async function saveTripAction(_: unknown, formData: FormData) {
  const account = await admin();
  try {
    const id = readString(formData, "id");
    const originLocationId = readString(formData, "originLocationId");
    const destinationLocationId = readString(formData, "destinationLocationId");
    const purposeId = readString(formData, "purposeId");
    const eventId = readString(formData, "eventId");
    const vehicleId = readString(formData, "vehicleId");
    const departureAt = readString(formData, "departureAt");
    const arrivalAt = readString(formData, "arrivalAt");
    const status = readString(formData, "status") || "DRAFT";
    const notes = readString(formData, "notes");
    if (!originLocationId || !destinationLocationId || !purposeId) {
      throw new AppError("Select a trip purpose, origin, and destination.");
    }
    if (originLocationId === destinationLocationId) {
      throw new AppError("Origin and destination cannot be the same location.");
    }
    const [originLocation, destinationLocation, purpose] = await Promise.all([
      orm.Location.where({ id: originLocationId, isActive: true }).first(),
      orm.Location.where({ id: destinationLocationId, isActive: true }).first(),
      orm.TripPurpose.where({ id: purposeId, isActive: true }).first(),
    ]);
    if (!originLocation || !destinationLocation) throw new AppError("Select two active locations.");
    if (!purpose) throw new AppError("Select an active trip purpose.");
    if (!departureAt) throw new AppError("Departure time is required.");
    const vehicle = vehicleId ? await orm.Vehicle.where({ id: vehicleId }).first() : null;
    if (vehicleId && !vehicle) throw new AppError("Selected vehicle not found.");
    if (vehicle && !vehicle.isActive) {
      throw new AppError(`Vehicle ${vehicle.name} (${vehicle.plateNumber}) is currently out of service.`);
    }

    const seatCapacity = Number(readString(formData, "seatCapacity") || vehicle?.seatCapacity || 0);
    if (!Number.isInteger(seatCapacity) || seatCapacity < 1) {
      throw new AppError("Trip seat capacity must be a positive integer.");
    }
    if (vehicle && seatCapacity > vehicle.seatCapacity) {
      throw new AppError(
        `Trip seat capacity (${seatCapacity}) cannot exceed assigned vehicle capacity (${vehicle.seatCapacity}).`
      );
    }

    // Vehicle conflict check: ensure the vehicle is not assigned to another active departure within +/- 4 hours
    if (vehicle) {
      const tripTime = new Date(departureAt).getTime();
      const conflictWindowMs = 4 * 60 * 60 * 1000;
      const otherTrips = await orm.Trip.where({ vehicleId: vehicle.id }).all();

      for (const ot of otherTrips) {
        if (id && ot.id === id) continue;
        if (ot.status === "CANCELLED" || ot.status === "COMPLETED") continue;
        const otTime = new Date(ot.departureAt).getTime();
        if (Math.abs(tripTime - otTime) < conflictWindowMs) {
          const timeStr = new Date(ot.departureAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
          const dateStr = new Date(ot.departureAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
          throw new AppError(
            `Vehicle ${vehicle.name} (${vehicle.plateNumber}) is already assigned to a departure on ${dateStr} at ${timeStr}. Choose another vehicle or reschedule.`
          );
        }
      }
    }
    const farePerSeat = Number(readString(formData, "farePerSeat") || 450);
    if (!Number.isInteger(farePerSeat) || farePerSeat < 0) {
      throw new AppError("Fare per seat must be a non-negative integer.");
    }
    const existing = id ? await orm.Trip.where({ id }).first() : null;
    if (id && !existing) throw new AppError("Trip not found.");
    if (existing && seatCapacity < existing.seatsReserved) {
      throw new AppError("Capacity cannot be lower than seats already reserved.");
    }
    const bookingDeadline = readString(formData, "bookingDeadline");
    let route = await orm.Route.where({ originLocationId, destinationLocationId }).first();
    if (!route) {
      try {
        route = await orm.Route.create({
          name: `${originLocation.name} to ${destinationLocation.name}`,
          originLocationId,
          destinationLocationId,
          isActive: true,
        });
      } catch (error) {
        route = await orm.Route.where({ originLocationId, destinationLocationId }).first();
        if (!route) throw error;
      }
    }
    const payload = {
      routeId: route.id,
      originLocationId,
      destinationLocationId,
      purposeId,
      eventId: eventId || null,
      vehicleId: vehicleId || null,
      departureAt: new Date(departureAt).toISOString(),
      arrivalAt: arrivalAt ? new Date(arrivalAt).toISOString() : null,
      bookingDeadline: bookingDeadline ? new Date(bookingDeadline).toISOString() : null,
      farePerSeat,
      seatCapacity,
      status: status as "DRAFT" | "PUBLISHED" | "CLOSED" | "DEPARTED" | "COMPLETED" | "CANCELLED",
      notes: notes || null,
      createdById: account.id,
    };
    if (id) {
      await orm.Trip.where({ id }).update(payload);
    } else {
      await orm.Trip.create({ ...payload, seatsReserved: 0 });
    }
    await writeAudit({
      actorId: account.id,
      action: id ? "trip.update" : "trip.create",
      entityType: "Trip",
      entityId: id || route.id,
    });
  } catch (error) {
    const formatted = formatErrorResponse(error);
    return { error: formatted.error };
  }
  revalidatePath("/admin/trips");
  revalidatePath("/trips");
  return { ok: true };
}

type AccountActionResult = { ok: true } | { error: string };

function readAccountInput(formData: FormData) {
  const fullName = readString(formData, "fullName");
  const email = readString(formData, "email").toLowerCase();
  const phone = readString(formData, "phone");
  const role = readString(formData, "role");
  const password = String(formData.get("password") ?? "");

  if (fullName.length < 3 || fullName.length > 120) {
    throw new AppError("Enter a name between 3 and 120 characters.");
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError("Enter a valid email address.");
  }
  if (phone.length > 40) throw new AppError("Phone number must be 40 characters or fewer.");
  if (!(ROLES as readonly string[]).includes(role)) {
    throw new AppError("Select a valid account role.");
  }
  if (password.length < 8 || password.length > 256) {
    throw new AppError("Password must be between 8 and 256 characters.");
  }

  return { fullName, email, phone, role: role as Role, password };
}

function readAccountId(formData: FormData) {
  const id = readString(formData, "id");
  if (!id || id.length > 128) throw new AppError("Select a valid account.");
  return id;
}

function accountActionError(error: unknown, fallback: string): AccountActionResult {
  if (error instanceof AppError) return { error: error.message };
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "23505"
  ) {
    return { error: "An account with this email already exists." };
  }
  console.error("Account management operation failed.", error instanceof Error ? error.name : "Unknown error");
  return { error: fallback };
}

async function lockAdminAccounts(tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) {
  return tx.orm.public.Account.where((account) => account.role.eq("ADMIN"))
    .orderBy((account) => account.id.asc())
    .forUpdate()
    .all();
}

async function requireCurrentAdmin(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  actorId: string
) {
  const actor = await tx.orm.public.Account.where({
    id: actorId,
    role: "ADMIN",
    isActive: true,
  })
    .forUpdate()
    .first();
  if (!actor) throw new AppError("Your administrator access is no longer active.", 403);
  return actor;
}

async function writeAccountAudit(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  actorId: string,
  action: string,
  accountId: string
) {
  await tx.orm.public.AuditEvent.create({
    actorId,
    action,
    entityType: "Account",
    entityId: accountId,
  });
}

async function invalidateAccountSessions(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  accountId: string,
) {
  const sessions = await tx.orm.public.Session.where({ accountId }).all();
  for (const session of sessions) {
    await tx.orm.public.Session.where({ id: session.id }).delete();
  }
  const remainingSession = await tx.orm.public.Session.where({ accountId }).first();
  if (remainingSession) {
    throw new Error("Account session invalidation did not remove every session.");
  }
}

export async function createAccountAction(formData: FormData): Promise<AccountActionResult> {
  const actor = await admin();
  try {
    const input = readAccountInput(formData);
    const passwordHash = await hashPassword(input.password);
    await db.transaction(async (tx) => {
      await lockAdminAccounts(tx);
      await requireCurrentAdmin(tx, actor.id);
      const existing = await tx.orm.public.Account.where({ email: input.email }).first();
      if (existing) throw new AppError("An account with this email already exists.");
      const account = await tx.orm.public.Account.create({
        fullName: input.fullName,
        email: input.email,
        phone: input.phone || null,
        role: input.role,
        isActive: true,
        passwordHash,
      });
      await writeAccountAudit(tx, actor.id, "account.create", account.id);
    });
    revalidatePath("/admin/accounts");
    return { ok: true };
  } catch (error) {
    return accountActionError(error, "Unable to create the account.");
  }
}

export async function changeAccountRoleAction(formData: FormData): Promise<AccountActionResult> {
  const actor = await admin();
  let shouldLogOut = false;
  try {
    const id = readAccountId(formData);
    const role = readString(formData, "role");
    if (!(ROLES as readonly string[]).includes(role)) {
      throw new AppError("Select a valid account role.");
    }

    shouldLogOut = await db.transaction(async (tx) => {
      const administrators = await lockAdminAccounts(tx);
      await requireCurrentAdmin(tx, actor.id);
      const account = await tx.orm.public.Account.where({ id }).forUpdate().first();
      if (!account) throw new AppError("Account not found.");

      const nextRole = role as Role;
      if (
        account.role === "ADMIN" &&
        account.isActive &&
        nextRole !== "ADMIN" &&
        administrators.filter((item) => item.isActive).length <= 1
      ) {
        throw new AppError("The last active Admin cannot be demoted.");
      }

      if (account.role !== nextRole) {
        await tx.orm.public.Account.where({ id }).update({ role: nextRole });
        await invalidateAccountSessions(tx, id);
        await writeAccountAudit(tx, actor.id, "account.role_change", id);
      }
      return actor.id === id && account.role !== nextRole;
    });
  } catch (error) {
    return accountActionError(error, "Unable to change the account role.");
  }
  revalidatePath("/admin/accounts");
  if (shouldLogOut) redirect("/login");
  return { ok: true };
}

export async function setAccountActiveAction(formData: FormData): Promise<AccountActionResult> {
  const actor = await admin();
  let shouldLogOut = false;
  try {
    const id = readAccountId(formData);
    const activeValue = readString(formData, "active");
    if (activeValue !== "true" && activeValue !== "false") {
      throw new AppError("Select a valid account status.");
    }
    const active = activeValue === "true";

    shouldLogOut = await db.transaction(async (tx) => {
      const administrators = await lockAdminAccounts(tx);
      await requireCurrentAdmin(tx, actor.id);
      const account = await tx.orm.public.Account.where({ id }).forUpdate().first();
      if (!account) throw new AppError("Account not found.");

      if (
        !active &&
        account.role === "ADMIN" &&
        account.isActive &&
        administrators.filter((item) => item.isActive).length <= 1
      ) {
        throw new AppError("The last active Admin cannot be disabled.");
      }

      if (account.isActive !== active) {
        await tx.orm.public.Account.where({ id }).update({ isActive: active });
        if (!active) await invalidateAccountSessions(tx, id);
        await writeAccountAudit(tx, actor.id, active ? "account.enable" : "account.disable", id);
      }
      return actor.id === id && !active && account.isActive;
    });
  } catch (error) {
    return accountActionError(error, "Unable to update the account status.");
  }
  revalidatePath("/admin/accounts");
  if (shouldLogOut) redirect("/login");
  return { ok: true };
}

export async function resetAccountPasswordAction(
  formData: FormData
): Promise<AccountActionResult> {
  const actor = await admin();
  const id = readString(formData, "id");
  try {
    readAccountId(formData);
    const password = String(formData.get("password") ?? "");
    if (password.length < 8 || password.length > 256) {
      throw new AppError("Password must be between 8 and 256 characters.");
    }
    const passwordHash = await hashPassword(password);

    await db.transaction(async (tx) => {
      await lockAdminAccounts(tx);
      await requireCurrentAdmin(tx, actor.id);
      const account = await tx.orm.public.Account.where({ id }).forUpdate().first();
      if (!account) throw new AppError("Account not found.");
      await tx.orm.public.Account.where({ id }).update({ passwordHash });
      await invalidateAccountSessions(tx, id);
      await writeAccountAudit(tx, actor.id, "account.password_reset", id);
    });

    revalidatePath("/admin/accounts");
  } catch (error) {
    return accountActionError(error, "Unable to reset the account password.");
  }
  if (actor.id === id) {
    await destroySession();
    redirect("/login");
  }
  return { ok: true };
}
