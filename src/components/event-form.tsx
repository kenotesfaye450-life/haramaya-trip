"use client";

import { saveEventAction } from "@/lib/actions/admin";
import { Alert, Field, inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/form-status";
import { useActionState } from "react";

type EventFormDraft = {
  id?: string;
  name?: string;
  description?: string | null;
  startsOn?: string | null;
  endsOn?: string | null;
  isActive?: boolean;
};

export function EventForm({ eventToEdit }: { eventToEdit?: EventFormDraft }) {
  const [state, action] = useActionState(saveEventAction, null);

  return (
    <form action={action} className="space-y-4">
      {eventToEdit?.id ? <input type="hidden" name="id" value={eventToEdit.id} /> : null}
      {state?.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state && "ok" in state && state.ok ? (
        <Alert tone="success">Travel event saved.</Alert>
      ) : null}

      <Field label="Event Name">
        <input
          className={inputClass}
          name="name"
          defaultValue={eventToEdit?.name ?? ""}
          placeholder="e.g. Graduation Travel"
          required
        />
      </Field>

      <Field label="Description (Optional)">
        <textarea
          className={`${inputClass} h-20 py-2`}
          name="description"
          defaultValue={eventToEdit?.description ?? ""}
          placeholder="Optional details for this travel period"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Starts On">
          <input
            className={inputClass}
            name="startsOn"
            type="date"
            defaultValue={eventToEdit?.startsOn ?? ""}
            required
          />
        </Field>

        <Field label="Ends On">
          <input
            className={inputClass}
            name="endsOn"
            type="date"
            defaultValue={eventToEdit?.endsOn ?? ""}
            required
          />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm text-zinc-700">
        <input type="checkbox" name="isActive" defaultChecked={eventToEdit ? eventToEdit.isActive : true} />
        Active
      </label>

      <SubmitButton>{eventToEdit ? "Update Event" : "Create Event"}</SubmitButton>
    </form>
  );
}
