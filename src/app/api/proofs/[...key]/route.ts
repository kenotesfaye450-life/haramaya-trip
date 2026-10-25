import { getCurrentAccount } from "@/lib/auth";
import { orm } from "@/lib/db";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const account = await getCurrentAccount();
  if (!account) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { key } = await params;
  if (!key || key.length === 0) notFound();

  // Guard against path traversal
  const keyPath = key.join("/");
  if (keyPath.includes("..") || path.isAbsolute(keyPath)) {
    return new Response("Invalid key", { status: 400 });
  }

  const bookingId = key[0];
  const proof = await orm.PaymentProof.where({ storageKey: keyPath }).first();
  if (!proof) notFound();

  // Authorization check: must be ADMIN or the booking owner
  if (account.role !== "ADMIN") {
    const booking = await orm.Booking.where({ id: bookingId }).first();
    if (!booking || booking.accountId !== account.id) {
      return new Response("Forbidden", { status: 403 });
    }
  }

  const filePath = path.join(process.cwd(), "storage", "proofs", keyPath);
  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) notFound();

    const buffer = await readFile(filePath);
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": proof.mimeType || "application/octet-stream",
        "Content-Length": String(buffer.length),
        "Content-Disposition": `${proof.mimeType === "application/pdf" ? "attachment" : "inline"}; filename="${encodeURIComponent(proof.fileName)}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    notFound();
  }
}
