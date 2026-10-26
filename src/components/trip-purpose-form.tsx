"use client";

import { useActionState } from "react";
import { saveTripPurposeAction } from "@/lib/actions/admin";
import { Alert, Field, inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/form-status";

export interface TripPurposeDraft {
  id?: string;
  code?: string;
  name?: string;
  description?: string | null;
  isActive?: boolean;
}

export function TripPurposeForm({ purposeToEdit }: { purposeToEdit?: TripPurposeDraft }) {
  const [state, action] = useActionState(saveTripPurposeAction, null);
  return (
    <form action={action} className="space-y-3">
      {purposeToEdit?.id ? <input type="hidden" name="id" value={purposeToEdit.id} /> : null}
      {state?.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state && "ok" in state && state.ok ? <Alert tone="success">Trip purpose saved.</Alert> : null}
      <Field label="Purpose Name">
        <input className={inputClass} name="name" defaultValue={purposeToEdit?.name ?? ""} placeholder="e.g. Home-Town Departure" required />
      </Field>
      <Field label="Purpose Code" hint={purposeToEdit ? "Purpose codes remain stable after creation." : "Unique identifier used by the system"}>
        <input className={inputClass} name="code" defaultValue={purposeToEdit?.code ?? ""} placeholder="e.g. HOME_TOWN_DEPARTURE" maxLength={40} required readOnly={!!purposeToEdit} />
      </Field>
      <Field label="Description">
        <textarea className={`${inputClass} h-20 py-2`} name="description" defaultValue={purposeToEdit?.description ?? ""} placeholder="What this trip purpose is used for" />
      </Field>
      {purposeToEdit?.id ? (
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input type="checkbox" name="isActive" defaultChecked={purposeToEdit.isActive} />
          Active and available for trip planning
        </label>
      ) : null}
      <SubmitButton>{purposeToEdit ? "Save Purpose" : "Add Purpose"}</SubmitButton>
    </form>
  );
}
