"use client";

import { useState } from "react";
import { saveCampusAction, saveRouteAction } from "@/lib/actions/admin";
import { Alert, Field, inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/form-status";
import { useActionState } from "react";

export function LocationForm() {
  const [state, action] = useActionState(saveCampusAction, null);
  return (
    <form action={action} className="space-y-3">
      {state?.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state && "ok" in state && state.ok ? <Alert tone="success">Location saved successfully.</Alert> : null}
      <Field label="Location Name">
        <input className={inputClass} name="name" placeholder="e.g. Main Campus or Finfinne Terminal" required />
      </Field>
      <Field label="Location Code (3-4 Letters)">
        <input className={inputClass} name="code" placeholder="e.g. MAIN, FIN, HAW" required maxLength={8} />
      </Field>
      <SubmitButton>Add Location</SubmitButton>
    </form>
  );
}

export function RouteForm({
  campuses,
  destinations,
}: {
  campuses: Array<{ id: string; name: string }>;
  destinations: Array<{ id: string; name: string }>;
}) {
  const [state, action] = useActionState(saveRouteAction, null);
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [routeName, setRouteName] = useState("");
  const [nameManuallyEdited, setNameManuallyEdited] = useState(false);

  const handleFromChange = (newFrom: string) => {
    setFromId(newFrom);
    if (!nameManuallyEdited) {
      const fromObj = campuses.find((c) => c.id === newFrom);
      const toObj = destinations.find((d) => d.id === toId);
      if (fromObj && toObj) {
        setRouteName(`${fromObj.name} to ${toObj.name}`);
      } else if (fromObj) {
        setRouteName(`${fromObj.name} to ...`);
      }
    }
  };

  const handleToChange = (newTo: string) => {
    setToId(newTo);
    if (!nameManuallyEdited) {
      const fromObj = campuses.find((c) => c.id === fromId);
      const toObj = destinations.find((d) => d.id === newTo);
      if (fromObj && toObj) {
        setRouteName(`${fromObj.name} to ${toObj.name}`);
      }
    }
  };

  return (
    <form action={action} className="space-y-3">
      {state?.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state && "ok" in state && state.ok ? <Alert tone="success">Route created successfully.</Alert> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Departure Location (From)">
          <select
            className={inputClass}
            name="originCampusId"
            value={fromId}
            onChange={(e) => handleFromChange(e.target.value)}
            required
          >
            <option value="" disabled>Select origin...</option>
            {campuses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Arrival Location (To)">
          <select
            className={inputClass}
            name="destinationId"
            value={toId}
            onChange={(e) => handleToChange(e.target.value)}
            required
          >
            <option value="" disabled>Select arrival destination...</option>
            {destinations.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Route Display Name">
        <input
          className={inputClass}
          name="name"
          value={routeName}
          onChange={(e) => {
            setRouteName(e.target.value);
            setNameManuallyEdited(true);
          }}
          placeholder="e.g. Main Campus to Finfinne"
          required
        />
      </Field>

      <SubmitButton>Create Route</SubmitButton>
    </form>
  );
}