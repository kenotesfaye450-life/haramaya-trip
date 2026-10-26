"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { ROLES, type Role } from "@/lib/constants";
import { hashPassword } from "@/lib/crypto";
import { orm } from "@/lib/db";
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

export async function saveAccountAction(_: unknown, formData: FormData) {
  const actor = await admin();
  try {
    const id = readString(formData, "id");
    const fullName = readString(formData, "fullName");
    const email = readString(formData, "email").toLowerCase();
    const phone = readString(formData, "phone");
    const role = readString(formData, "role");
    const password = String(formData.get("password") ?? "");
    if (!fullName || !email) throw new AppError("Name and email are required.");
    if (!(ROLES as readonly string[]).includes(role)) throw new AppError("Select a valid role.");
    if (id) {
      await orm.Account.where({ id }).update({
        fullName,
        email,
        phone: phone || null,
        role: role as Role,
        isActive: bool(formData, "isActive"),
      });
      if (password.length >= 8) {
        await orm.Account.where({ id }).update({ passwordHash: await hashPassword(password) });
      }
    } else {
      if (password.length < 8) throw new AppError("Password must be at least 8 characters.");
      await orm.Account.create({
        fullName,
        email,
        phone: phone || null,
        role: role as Role,
        isActive: true,
        passwordHash: await hashPassword(password),
      });
    }
    await writeAudit({
      actorId: actor.id,
      action: id ? "account.update" : "account.create",
      entityType: "Account",
      entityId: id || email,
    });
  } catch (error) {
    const formatted = formatErrorResponse(error);
    return { error: formatted.error };
  }
  revalidatePath("/admin/accounts");
  return { ok: true };
}
