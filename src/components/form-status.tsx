"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  variant = "primary",
}: {
  children: string;
  variant?: "primary" | "danger" | "success";
}) {
  const { pending } = useFormStatus();
  const styles = {
    primary: "bg-zinc-950 text-white hover:bg-zinc-800",
    danger: "bg-red-700 text-white hover:bg-red-800",
    success: "bg-green-700 text-white hover:bg-green-800",
  }[variant];
  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex h-10 items-center px-4 text-sm font-medium disabled:opacity-50 ${styles}`}
    >
      {pending ? "Working…" : children}
    </button>
  );
}
