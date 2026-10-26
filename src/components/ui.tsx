import Link from "next/link";
import { Button as ActionButton, type ButtonVariant } from "@/components/ui/button";
import { classNames } from "@/lib/format";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between pb-4 border-b border-[#DCE4EC]">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#102A43]">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-xs text-[#52677D]">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={classNames("border border-[#E3E8E5] bg-white rounded-xl shadow-xs", className)}>{children}</section>
  );
}

export function Button({
  children,
  href,
  variant = "primary",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  href?: string;
  variant?: ButtonVariant;
}) {
  if (href) {
    return (
      <ActionButton variant={variant} size="default" asChild {...props}>
        <Link href={href}>{children}</Link>
      </ActionButton>
    );
  }

  return (
    <ActionButton type={type} variant={variant} size="default" {...props}>
      {children}
    </ActionButton>
  );
}
export function Field({
  label,
  name,
  children,
  hint,
}: {
  label: string;
  name?: string;
  children?: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block space-y-1 text-xs">
      <span className="font-semibold text-[#171717] uppercase tracking-wide">{label}</span>
      {children ?? (
        <input
          name={name}
          className="h-9 w-full border border-[#E3E8E5] rounded-lg bg-white px-3 text-xs outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green"
        />
      )}
      {hint ? <span className="block text-[11px] text-[#66706A]">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  "h-9 w-full border border-[#E3E8E5] rounded-lg bg-white px-3 text-xs outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green transition-colors";

export function StatusBadge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "success" | "danger" | "warning";
  children: ReactNode;
}) {
  const styles = {
    neutral: "bg-[#F3F6F4] text-[#4B5563] border-[#E5E7EB]",
    success: "bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]",
    danger: "bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]",
    warning: "bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]",
  }[tone];
  return (
    <span className={classNames("inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border", styles)}>
      {children}
    </span>
  );
}

export function bookingTone(status: string) {
  if (status === "CONFIRMED") return "success" as const;
  if (status === "REJECTED" || status === "CANCELLED") return "danger" as const;
  if (status === "PENDING_REVIEW") return "warning" as const;
  return "neutral" as const;
}

export function Alert({ tone, children }: { tone: "danger" | "success"; children: ReactNode }) {
  return (
    <div
      className={classNames(
        "border rounded-lg px-3 py-2 text-xs",
        tone === "danger"
          ? "border-[#FECACA] bg-[#FEF2F2] text-[#991B1B] border-l-4 border-l-[#DC2626]"
          : "border-[#A7F3D0] bg-[#ECFDF5] text-[#065F46] border-l-4 border-l-brand-green",
      )}
    >
      {children}
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="border border-dashed border-[#E3E8E5] bg-white rounded-xl px-6 py-12 text-center">
      <h2 className="text-sm font-bold text-[#0A0A0A]">{title}</h2>
      <p className="mt-1 text-xs text-[#66706A] max-w-sm mx-auto">{body}</p>
    </div>
  );
}

export function DataTable({
  headers,
  children,
}: {
  headers: string[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto border border-[#E3E8E5] bg-white rounded-xl shadow-xs">
      <table className="min-w-full text-left text-xs">
        <thead className="border-b border-[#E3E8E5] bg-[#F8FAF9] text-[11px] uppercase tracking-wider text-[#66706A] font-semibold">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-2.5">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E3E8E5]/70">{children}</tbody>
      </table>
    </div>
  );
}
