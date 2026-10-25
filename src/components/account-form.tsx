"use client";

import { saveAccountAction } from "@/lib/actions/admin";
import { Alert, Field, inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/form-status";
import { ROLES } from "@/lib/constants";
import { useActionState } from "react";

type AccountFormDraft = {
  id?: string;
  fullName?: string;
  email?: string;
  phone?: string | null;
  role?: string;
};

export function AccountForm({ accountToEdit }: { accountToEdit?: AccountFormDraft | null }) {
  const [state, action] = useActionState(saveAccountAction, null);

  return (
    <form action={action} className="space-y-4">
      {accountToEdit?.id ? <input type="hidden" name="id" value={accountToEdit.id} /> : null}
      {state?.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state && "ok" in state && state.ok ? <Alert tone="success">Account saved.</Alert> : null}

      <Field label="Full Name">
        <input
          className={inputClass}
          name="fullName"
          defaultValue={accountToEdit?.fullName ?? ""}
          required
        />
      </Field>

      <Field label="Email Address">
        <input
          className={inputClass}
          name="email"
          type="email"
          defaultValue={accountToEdit?.email ?? ""}
          required
        />
      </Field>

      <Field label="Phone Number">
        <input
          className={inputClass}
          name="phone"
          defaultValue={accountToEdit?.phone ?? ""}
          placeholder="+251..."
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="System Role">
          <select
            className={inputClass}
            name="role"
            defaultValue={accountToEdit?.role ?? "TRAVELER"}
            required
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label={accountToEdit ? "Change Password (Optional)" : "Password"}
          hint={accountToEdit ? "Leave empty to keep current password" : "At least 8 characters"}
        >
          <input
            className={inputClass}
            name="password"
            type="password"
            required={!accountToEdit}
          />
        </Field>
      </div>

      <SubmitButton>{accountToEdit ? "Update Account" : "Create Account"}</SubmitButton>
    </form>
  );
}
