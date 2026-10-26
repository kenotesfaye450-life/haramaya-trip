"use server";

import { redirect } from "next/navigation";
import { createSession, destroySession, getCurrentAccount } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { hashPassword, verifyPassword } from "@/lib/crypto";
import { orm } from "@/lib/db";
import { safeReturnTo } from "@/lib/return-to";
import { AppError, formatErrorResponse } from "@/lib/errors";

function readString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function registerAction(_: unknown, formData: FormData) {
  const returnTo = safeReturnTo(readString(formData, "next"));

  try {
    const fullName = readString(formData, "fullName");
    const email = readString(formData, "email").toLowerCase();
    const phone = readString(formData, "phone");
    const password = String(formData.get("password") ?? "");
    if (fullName.length < 3) throw new AppError("Enter your full name.");
    if (!email.includes("@")) throw new AppError("Enter a valid email address.");
    if (password.length < 8) throw new AppError("Password must be at least 8 characters.");
    const existing = await orm.Account.where({ email }).first();
    if (existing) throw new AppError("An account with this email already exists.");
    const account = await orm.Account.create({
      email,
      fullName,
      phone: phone || null,
      passwordHash: await hashPassword(password),
      role: "TRAVELER",
      isActive: true,
    });
    await createSession(account.id);
    await writeAudit({
      actorId: account.id,
      action: "account.register",
      entityType: "Account",
      entityId: account.id,
    });
  } catch (error) {
    const formatted = formatErrorResponse(error);
    return { error: formatted.error };
  }

  redirect(returnTo || "/trips");
}

export async function loginAction(_: unknown, formData: FormData) {
  const returnTo = safeReturnTo(readString(formData, "next"));

  try {
    const email = readString(formData, "email").toLowerCase();
    const password = String(formData.get("password") ?? "");
    const account = await orm.Account.where({ email }).first();
    if (!account || !(await verifyPassword(password, account.passwordHash))) {
      throw new AppError("Invalid email or password.");
    }
    if (!account.isActive) throw new AppError("This account is disabled.");
    await createSession(account.id);
    await writeAudit({
      actorId: account.id,
      action: "account.login",
      entityType: "Account",
      entityId: account.id,
    });
  } catch (error) {
    const formatted = formatErrorResponse(error);
    return { error: formatted.error };
  }

  if (returnTo) redirect(returnTo);

  const account = await getCurrentAccount();
  if (account?.role === "ADMIN") redirect("/admin");
  if (account?.role === "STAFF") redirect("/staff");
  redirect("/trips");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
