import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, SESSION_TTL_MS, type Role } from "@/lib/constants";
import { hmac, safeEqual, sha256 } from "@/lib/crypto";
import { orm } from "@/lib/db";
import { authPageHref } from "@/lib/return-to";

export type SessionAccount = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: Role;
  isActive: boolean;
};

function signCookie(sessionId: string, token: string) {
  const payload = `${sessionId}.${token}`;
  return `${payload}.${hmac(payload)}`;
}

function readCookie(value: string | undefined) {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [sessionId, token, signature] = parts;
  const payload = `${sessionId}.${token}`;
  if (!safeEqual(hmac(payload), signature)) return null;
  return { sessionId, token };
}

export async function createSession(accountId: string) {
  const token = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  const session = await orm.Session.create({
    accountId,
    tokenHash: sha256(token),
    expiresAt,
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, signCookie(session.id, token), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function destroySession() {
  const jar = await cookies();
  const parsed = readCookie(jar.get(SESSION_COOKIE)?.value);
  if (parsed) {
    await orm.Session.where({ id: parsed.sessionId }).delete();
  }
  jar.delete(SESSION_COOKIE);
}

export async function getCurrentAccount(): Promise<SessionAccount | null> {
  const jar = await cookies();
  const parsed = readCookie(jar.get(SESSION_COOKIE)?.value);
  if (!parsed) return null;
  const session = await orm.Session.where({ id: parsed.sessionId }).include("account").first();
  if (!session) return null;
  if (session.tokenHash !== sha256(parsed.token)) return null;
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    await orm.Session.where({ id: session.id }).delete();
    return null;
  }
  if (!session.account.isActive) return null;
  return {
    id: session.account.id,
    email: session.account.email,
    fullName: session.account.fullName,
    phone: session.account.phone,
    role: session.account.role as Role,
    isActive: session.account.isActive,
  };
}

export async function requireAccount(returnTo?: string) {
  const account = await getCurrentAccount();
  if (!account) redirect(authPageHref("login", returnTo));
  return account;
}

async function requireRoleFor(returnTo: string | undefined, roles: Role[]) {
  const account = await requireAccount(returnTo);
  if (!roles.includes(account.role)) redirect("/");
  return account;
}

export async function requireRole(...roles: Role[]) {
  return requireRoleFor(undefined, roles);
}

export async function requireRoleAt(returnTo: string, ...roles: Role[]) {
  return requireRoleFor(returnTo, roles);
}

export function canManage(account: SessionAccount) {
  return account.role === "ADMIN";
}

export function canStaff(account: SessionAccount) {
  return account.role === "STAFF" || account.role === "ADMIN";
}
