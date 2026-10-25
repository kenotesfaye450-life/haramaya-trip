import { hmac, randomPublicCode, safeEqual, sha256 } from "@/lib/crypto";

export type TicketPayload = {
  v: 1;
  ticketId: string;
  passengerId: string;
};

export function newPublicCode() {
  return randomPublicCode();
}

export function encodeTicketPayload(payload: TicketPayload) {
  const body = `${payload.v}.${payload.ticketId}.${payload.passengerId}`;
  return `${body}.${hmac(body)}`;
}

export function decodeTicketPayload(raw: string): TicketPayload | null {
  const parts = raw.trim().split(".");
  if (parts.length !== 4 || parts[0] !== "1") return null;
  const [, ticketId, passengerId, signature] = parts;
  const body = `1.${ticketId}.${passengerId}`;
  if (!safeEqual(hmac(body), signature)) return null;
  return { v: 1, ticketId, passengerId };
}

export { sha256 };
