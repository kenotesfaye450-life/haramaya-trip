import { getCurrentAccount } from "@/lib/auth";
import { formatErrorResponse } from "@/lib/errors";
import {
  createPaymentProofSignedUrl,
  isCurrentPaymentProofStorageKey,
  readLocalPaymentProofObject,
  usesLocalPaymentProofStorage,
} from "@/lib/payment-proof-storage";
import { orm } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const account = await getCurrentAccount();
  if (!account) return new Response("Unauthorized", { status: 401 });

  const { key } = await params;
  if (
    !key?.length ||
    key.length !== 2 ||
    key.some((segment) => !segment || segment === "." || segment === ".." || segment.includes("\\"))
  ) {
    return new Response("Invalid payment proof reference.", { status: 400 });
  }

  const storageKey = key.join("/");
  const proof = await orm.PaymentProof.where({ storageKey }).first();
  if (!proof) return new Response("Payment proof not found.", { status: 404 });

  if (account.role !== "ADMIN") {
    if (account.role !== "TRAVELER") {
      return new Response("Forbidden", { status: 403 });
    }
    const booking = await orm.Booking.where({ id: proof.bookingId }).first();
    if (!booking || booking.accountId !== account.id) {
      return new Response("Forbidden", { status: 403 });
    }
  }

  if (!isCurrentPaymentProofStorageKey(storageKey, proof.bookingId)) {
    return new Response(
      "This legacy proof was stored on the application filesystem and is unavailable from private storage.",
      {
        status: 410,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  }

  if (usesLocalPaymentProofStorage()) {
    try {
      const contents = await readLocalPaymentProofObject(storageKey);
      return new Response(contents, {
        status: 200,
        headers: {
          "Content-Type": proof.mimeType,
          "Content-Length": String(contents.length),
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch (error) {
      const formatted = formatErrorResponse(error);
      return new Response(formatted.error, {
        status: formatted.statusCode,
        headers: {
          "Cache-Control": "private, no-store",
          "Content-Type": "text/plain; charset=utf-8",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
  }

  try {
    const signedUrl = await createPaymentProofSignedUrl(storageKey);
    return new Response(null, {
      status: 302,
      headers: {
        Location: signedUrl,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const formatted = formatErrorResponse(error);
    return new Response(formatted.error, {
      status: formatted.statusCode,
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
}
