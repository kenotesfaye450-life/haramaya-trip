const INTERNAL_ORIGIN = "https://haramaya-trip.invalid";

export function safeReturnTo(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const candidate = value.trim();
  if (
    !candidate ||
    candidate.length > 2048 ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\")
  ) {
    return null;
  }

  try {
    const target = new URL(candidate, INTERNAL_ORIGIN);
    if (
      target.origin !== INTERNAL_ORIGIN ||
      target.pathname === "/login" ||
      target.pathname === "/register"
    ) {
      return null;
    }

    return target.pathname + target.search + target.hash;
  } catch {
    return null;
  }
}

export function authPageHref(
  page: "login" | "register",
  returnTo?: string | null
) {
  const safe = safeReturnTo(returnTo);
  if (!safe) return "/" + page;

  const params = new URLSearchParams({ next: safe });
  return "/" + page + "?" + params.toString();
}
