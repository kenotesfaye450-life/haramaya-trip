"use client";

import { useEffect, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  changeAccountRoleAction,
  createAccountAction,
  resetAccountPasswordAction,
  setAccountActiveAction,
} from "@/lib/actions/admin";
import { ROLES, type Role } from "@/lib/constants";
import { Button, StatusBadge } from "@/components/ui";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type ManagedAccount = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: Role;
  isActive: boolean;
  createdAt: string;
};

type AccountActionResult = { ok: true } | { error: string };
type AccountAction = (formData: FormData) => Promise<AccountActionResult>;

function AccountDialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/45 p-3 sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-dialog-title"
        className="mx-auto my-4 max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-4 shadow-2xl sm:my-10 sm:p-6"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 id="account-dialog-title" className="text-lg font-bold text-zinc-950">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-md px-2 py-1 text-xl leading-none text-zinc-600 hover:bg-zinc-100"
          >
            ×
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

export function AccountManagement({ accounts }: { accounts: ManagedAccount[] }) {
  const router = useRouter();
  const [dialogAccount, setDialogAccount] = useState<ManagedAccount | null>(null);
  const [creating, setCreating] = useState(false);
  const [role, setRole] = useState<Role>("TRAVELER");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const closeDialog = () => {
    if (pending) return;
    setDialogAccount(null);
    setCreating(false);
    setError("");
  };

  async function submitAction(action: AccountAction, formData: FormData) {
    setError("");
    startTransition(async () => {
      const result = await action(formData);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setDialogAccount(null);
      setCreating(false);
      router.refresh();
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>, action: AccountAction) {
    event.preventDefault();
    void submitAction(action, new FormData(event.currentTarget));
  }

  function openAccount(account: ManagedAccount) {
    setDialogAccount(account);
    setRole(account.role);
    setError("");
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold tracking-tight text-zinc-950">
          Registered Accounts ({accounts.length})
        </h2>
        <Button
          onClick={() => {
            setCreating(true);
            setError("");
          }}
        >
          Create Account
        </Button>
      </div>

      <div className="space-y-3 xl:hidden">
        {accounts.map((account) => (
          <article key={account.id} className="min-w-0 rounded-lg border border-zinc-200 bg-white p-4">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="break-words font-semibold text-zinc-950">{account.fullName}</h3>
                <p className="break-all text-sm text-zinc-600">{account.email}</p>
              </div>
              <Button variant="neutral" onClick={() => openAccount(account)}>
                Manage
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusBadge tone={account.role === "ADMIN" ? "danger" : account.role === "STAFF" ? "warning" : "neutral"}>
                {account.role}
              </StatusBadge>
              <StatusBadge tone={account.isActive ? "success" : "danger"}>
                {account.isActive ? "Active" : "Disabled"}
              </StatusBadge>
              {account.phone && <span className="break-all text-xs text-zinc-500">{account.phone}</span>}
            </div>
            <p className="mt-2 text-xs text-zinc-500">Registered {account.createdAt}</p>
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border border-zinc-200 xl:block">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">Full Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Registered</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {accounts.map((account) => (
              <tr key={account.id}>
                <td className="px-4 py-3 font-medium text-zinc-950">{account.fullName}</td>
                <td className="px-4 py-3 text-xs text-zinc-600">{account.email}</td>
                <td className="px-4 py-3">
                  <StatusBadge tone={account.role === "ADMIN" ? "danger" : account.role === "STAFF" ? "warning" : "neutral"}>
                    {account.role}
                  </StatusBadge>
                </td>
                <td className="px-4 py-3 text-xs text-zinc-600">{account.phone ?? "—"}</td>
                <td className="px-4 py-3">
                  <StatusBadge tone={account.isActive ? "success" : "danger"}>
                    {account.isActive ? "Active" : "Disabled"}
                  </StatusBadge>
                </td>
                <td className="px-4 py-3 text-xs text-zinc-500">{account.createdAt}</td>
                <td className="px-4 py-3 text-right">
                  <Button variant="neutral" onClick={() => openAccount(account)}>
                    Manage
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(creating || dialogAccount) && (
        <AccountDialog
          title={creating ? "Create Account" : `Manage ${dialogAccount?.fullName ?? "account"}`}
          onClose={closeDialog}
        >
          {creating ? (
            <form onSubmit={(event) => handleSubmit(event, createAccountAction)} className="space-y-4">
              <Input
                name="fullName"
                label="Full name"
                autoComplete="name"
                required
                minLength={3}
                maxLength={120}
              />
              <Input
                name="email"
                label="Email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
              />
              <Input name="phone" label="Phone (optional)" type="tel" autoComplete="tel" maxLength={40} />
              <Select
                name="role"
                label="Role"
                options={ROLES.map((value) => ({ value, label: value }))}
                required
              />
              <Input
                name="password"
                label="Initial password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={256}
              />
              {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                <Button variant="neutral" onClick={closeDialog} disabled={pending}>Cancel</Button>
                <Button type="submit" disabled={pending}>{pending ? "Creating…" : "Create Account"}</Button>
              </div>
            </form>
          ) : dialogAccount ? (
            <div className="space-y-6">
              <section className="space-y-3 border-b border-zinc-200 pb-5">
                <h3 className="font-semibold text-zinc-900">Role</h3>
                <form
                  onSubmit={(event) => handleSubmit(event, changeAccountRoleAction)}
                  className="flex flex-col gap-2 sm:flex-row sm:items-end"
                >
                  <input type="hidden" name="id" value={dialogAccount.id} />
                  <Select
                    name="role"
                    label="Account role"
                    value={role}
                    onChange={(event) => setRole(event.target.value as Role)}
                    options={ROLES.map((value) => ({ value, label: value }))}
                    required
                  />
                  <Button type="submit" variant="secondary" disabled={pending || role === dialogAccount.role}>
                    Save role
                  </Button>
                </form>
              </section>

              <section className="flex flex-col gap-3 border-b border-zinc-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-semibold text-zinc-900">Account status</h3>
                  <p className="text-sm text-zinc-600">
                    {dialogAccount.isActive ? "Active accounts can sign in." : "Disabled accounts cannot sign in."}
                  </p>
                </div>
                <form
                  onSubmit={(event) => {
                    if (
                      dialogAccount.isActive &&
                      !window.confirm(`Disable ${dialogAccount.fullName}'s account?`)
                    ) {
                      event.preventDefault();
                      return;
                    }
                    handleSubmit(event, setAccountActiveAction);
                  }}
                >
                  <input type="hidden" name="id" value={dialogAccount.id} />
                  <input type="hidden" name="active" value={String(!dialogAccount.isActive)} />
                  <Button type="submit" variant={dialogAccount.isActive ? "destructive" : "success"} disabled={pending}>
                    {dialogAccount.isActive ? "Disable account" : "Enable account"}
                  </Button>
                </form>
              </section>

              <section className="space-y-3">
                <h3 className="font-semibold text-zinc-900">Reset password</h3>
                <p className="text-sm text-zinc-600">
                  Set a new temporary password. Existing sessions for this account will be signed out.
                </p>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = event.currentTarget;
                    const values = new FormData(form);
                    if (values.get("password") !== values.get("confirmPassword")) {
                      setError("Passwords do not match.");
                      return;
                    }
                    void submitAction(resetAccountPasswordAction, values);
                  }}
                  className="space-y-3"
                >
                  <input type="hidden" name="id" value={dialogAccount.id} />
                  <Input
                    name="password"
                    label="New temporary password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    maxLength={256}
                  />
                  <Input
                    name="confirmPassword"
                    label="Confirm password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    maxLength={256}
                  />
                  {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
                  <Button type="submit" variant="secondary" disabled={pending}>
                    {pending ? "Resetting…" : "Reset password"}
                  </Button>
                </form>
              </section>
              {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
              <div className="flex justify-end">
                <Button variant="neutral" onClick={closeDialog} disabled={pending}>Close</Button>
              </div>
            </div>
          ) : null}
        </AccountDialog>
      )}
    </>
  );
}
