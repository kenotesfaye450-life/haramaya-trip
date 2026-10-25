import crypto from "node:crypto";

/** Create the short booking reference shown to travelers and staff. */
export function generateBookingReference(): string {
  return `HUT-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
}
