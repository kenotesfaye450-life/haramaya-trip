"use client";

import { useState } from "react";
import { saveLocationAction, saveRouteAction } from "@/lib/actions/admin";
import { Alert, Field, inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/form-status";
import { useActionState } from "react";

type LocationDraft = {
  id?: string;
  name?: string;
  code?: string;
  kind?: "CAMPUS" | "EXTERNAL";
  isActive?: boolean;
};

export function LocationForm({ locationToEdit }: { locationToEdit?: LocationDraft }) {
  const [state, action] = useActionState(saveLocationAction, null);
  return (
    <form action={action} className="space-y-3">
      {locationToEdit?.id ? <input type="hidden" name="id" value={locationToEdit.id} /> : null}
      {state?.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state && "ok" in state && state.ok ? <Alert tone="success">Location saved.</Alert> : null}
      <Field label="Location Name">
        <input className={inputClass} name="name" defaultValue={locationToEdit?.name ?? ""} placeholder="e.g. Main Campus or Finfinne" required />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Location Code">
          <input className={inputClass} name="code" defaultValue={locationToEdit?.code ?? ""} placeholder="e.g. MAIN, FIN, HAW" required maxLength={12} />
        </Field>
        <Field label="Location Type">
          <select className={inputClass} name="kind" defaultValue={locationToEdit?.kind ?? "EXTERNAL"} required>
            <option value="CAMPUS">Campus</option>
            <option value="EXTERNAL">External location</option>
          </select>
        </Field>
      </div>
      {locationToEdit?.id ? (
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input type="checkbox" name="isActive" defaultChecked={locationToEdit.isActive} />
          Active and available for trip planning
        </label>
      ) : null}
      <SubmitButton>{locationToEdit ? "Save Location" : "Add Location"}</SubmitButton>
    </form>
  );
}

export function RouteForm({ locations }: { locations: Array<{ id: string; name: string }> }) {
  const [state, action] = useActionState(saveRouteAction, null);
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [routeName, setRouteName] = useState("");
  const [nameManuallyEdited, setNameManuallyEdited] = useState(false);

  const updateName = (nextFrom: string, nextTo: string) => {
    if (nameManuallyEdited) return;
    const from = locations.find((location) => location.id === nextFrom);
    const to = locations.find((location) => location.id === nextTo);
    setRouteName(from && to ? `${from.name} to ${to.name}` : from ? `${from.name} to ...` : "");
  };

  return (
    <form action={action} className="space-y-3">
      {state?.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state && "ok" in state && state.ok ? <Alert tone="success">Route saved successfully.</Alert> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="From">
          <select className={inputClass} name="originLocationId" value={fromId} onChange={(e) => { setFromId(e.target.value); updateName(e.target.value, toId); }} required>
            <option value="" disabled>Select location...</option>
            {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
          </select>
        </Field>
        <Field label="Destination">
          <select className={inputClass} name="destinationLocationId" value={toId} onChange={(e) => { setToId(e.target.value); updateName(fromId, e.target.value); }} required>
            <option value="" disabled>Select location...</option>
            {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Route Display Name">
        <input className={inputClass} name="name" value={routeName} onChange={(e) => { setRouteName(e.target.value); setNameManuallyEdited(true); }} placeholder="e.g. Main Campus to Finfinne" required />
      </Field>
      <SubmitButton>Create Route</SubmitButton>
    </form>
  );
}
