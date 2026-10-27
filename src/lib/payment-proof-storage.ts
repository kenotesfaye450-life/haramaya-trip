import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/errors";

const PAYMENT_PROOF_BUCKET = "payment-proofs";
const SIGNED_URL_TTL_SECONDS = 5 * 60;

let storageClient: SupabaseClient | undefined;

function getStorageClient() {
  if (storageClient) return storageClient;

  const supabaseUrl = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !secretKey) {
    throw new AppError("Payment-proof storage is not configured.", 503);
  }

  let projectUrl: URL;
  try {
    projectUrl = new URL(supabaseUrl);
  } catch {
    console.error("Payment-proof Supabase project URL is invalid.", {
      errorName: "InvalidSupabaseProjectUrl",
    });
    throw new AppError("Payment-proof storage configuration is invalid.", 503);
  }
  if (
    (projectUrl.protocol !== "https:" && projectUrl.hostname !== "localhost" && projectUrl.hostname !== "127.0.0.1") ||
    projectUrl.pathname !== "/" ||
    projectUrl.search ||
    projectUrl.hash ||
    projectUrl.username ||
    projectUrl.password
  ) {
    console.error("Payment-proof Supabase URL must be the project base URL.", {
      errorName: "InvalidSupabaseProjectUrl",
    });
    throw new AppError("Payment-proof storage configuration is invalid.", 503);
  }

  try {
    storageClient = createClient(supabaseUrl, secretKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    });
  } catch (error) {
    console.error("Payment-proof Supabase client initialization failed.", {
      errorName: error instanceof Error ? error.name : "Unknown",
    });
    throw new AppError("Payment-proof storage configuration is invalid.", 503);
  }

  return storageClient;
}

export function usesLocalPaymentProofStorage() {
  return (
    process.env.NODE_ENV !== "production" &&
    !process.env.SUPABASE_URL &&
    !process.env.SUPABASE_SECRET_KEY
  );
}

const EXTENSION_BY_MIME_TYPE = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export function createPaymentProofStorageKey(bookingId: string, mimeType: string) {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(bookingId)) {
    throw new AppError("The booking identifier is invalid.", 400);
  }
  if (!(mimeType in EXTENSION_BY_MIME_TYPE)) {
    throw new AppError("Unsupported payment proof format.", 415);
  }

  const extension = EXTENSION_BY_MIME_TYPE[mimeType as keyof typeof EXTENSION_BY_MIME_TYPE];
  return `${bookingId}/${randomUUID()}-${randomUUID()}.${extension}`;
}

export function isCurrentPaymentProofStorageKey(key: string, bookingId: string) {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(bookingId)) return false;
  const escapedBookingId = bookingId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `^${escapedBookingId}/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\.(jpg|png|webp)$`,
    "i",
  ).test(key);
}

function validateStorageKey(key: string) {
  if (
    !key ||
    key.startsWith("/") ||
    key.includes("\\") ||
    key.split("/").some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new AppError("The payment proof reference is invalid.", 400);
  }
}

function getLocalStoragePath(storageKey: string) {
  validateStorageKey(storageKey);
  const storageRoot = path.resolve(process.cwd(), "storage", "proofs");
  const filePath = path.resolve(storageRoot, ...storageKey.split("/"));
  if (!filePath.startsWith(`${storageRoot}${path.sep}`)) {
    throw new AppError("The payment proof reference is invalid.", 400);
  }
  return filePath;
}

function safeStorageErrorDetails(error: unknown) {
  if (!error || typeof error !== "object") return { errorName: "Unknown" };
  const value = error as { name?: unknown; status?: unknown; statusCode?: unknown; code?: unknown };
  const errorName =
    typeof value.name === "string" && /^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(value.name)
      ? value.name
      : "Unknown";
  const statusCode =
    typeof value.status === "number"
      ? value.status
      : typeof value.statusCode === "number"
        ? value.statusCode
        : undefined;
  const errorCode =
    typeof value.code === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(value.code)
      ? value.code
      : undefined;
  return { errorName, statusCode, errorCode };
}

export async function uploadPaymentProofObject(
  storageKey: string,
  contents: Buffer,
  mimeType: string,
) {
  validateStorageKey(storageKey);
  if (usesLocalPaymentProofStorage()) {
    const filePath = getLocalStoragePath(storageKey);
    try {
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, contents, { flag: "wx" });
    } catch (error) {
      console.error("Local payment-proof storage upload failed.", safeStorageErrorDetails(error));
      throw new AppError("Unable to store the payment proof. Please try again.", 502);
    }
    return;
  }

  const { error } = await getStorageClient()
    .storage.from(PAYMENT_PROOF_BUCKET)
    .upload(storageKey, contents, {
      contentType: mimeType,
      upsert: false,
      cacheControl: "3600",
    });

  if (error) {
    console.error("Payment-proof storage upload failed.", safeStorageErrorDetails(error));
    throw new AppError("Unable to store the payment proof. Please try again.", 502);
  }
}

export async function readLocalPaymentProofObject(storageKey: string) {
  try {
    return await readFile(getLocalStoragePath(storageKey));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      throw new AppError("This proof file is unavailable from local storage.", 404);
    }
    throw error;
  }
}

export async function createPaymentProofSignedUrl(storageKey: string) {
  validateStorageKey(storageKey);
  const { data, error } = await getStorageClient()
    .storage.from(PAYMENT_PROOF_BUCKET)
    .createSignedUrl(storageKey, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    if (error) {
      console.error("Payment-proof signed URL creation failed.", safeStorageErrorDetails(error));
    }
    throw new AppError("This proof file is unavailable from private storage.", 404);
  }

  return data.signedUrl;
}

export async function deletePaymentProofObject(storageKey: string) {
  validateStorageKey(storageKey);
  if (usesLocalPaymentProofStorage()) {
    try {
      await unlink(getLocalStoragePath(storageKey));
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return;
      console.error("Local payment-proof storage cleanup failed.", safeStorageErrorDetails(error));
      throw new AppError("Unable to clean up an unlinked payment proof.", 502);
    }
    return;
  }

  const { error } = await getStorageClient()
    .storage.from(PAYMENT_PROOF_BUCKET)
    .remove([storageKey]);

  if (error) {
    console.error("Payment-proof storage cleanup failed.", safeStorageErrorDetails(error));
    throw new AppError("Unable to clean up an unlinked payment proof.", 502);
  }
}
