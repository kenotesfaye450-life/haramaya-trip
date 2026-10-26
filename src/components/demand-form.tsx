"use client";

import { submitDemandAction } from "@/lib/actions/demand";
import { Alert, Field, inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/form-status";
import { useActionState } from "react";

export function DemandForm({
  locations,
  events,
  initialFromLocationId = "",
  initialToLocationId = "",
  initialDate = "",
  initialPassengers = 1,
}: {
  locations: Array<{ id: string; name: string }>;
  events: Array<{ id: string; name: string }>;
  initialFromLocationId?: string;
  initialToLocationId?: string;
  initialDate?: string;
  initialPassengers?: number;
}) {
  const [state, action] = useActionState(submitDemandAction, null);

  return (
    <form action={action} className="space-y-4">
      {state?.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state && "ok" in state && state.ok ? (
        <Alert tone="success">Your travel demand has been submitted. Transport planners review demand daily.</Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="From">
          <select className={inputClass} name="originLocationId" required defaultValue={initialFromLocationId}>
            <option value="" disabled>Select origin...</option>
            {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
          </select>
        </Field>
        <Field label="Destination">
          <select className={inputClass} name="destinationLocationId" required defaultValue={initialToLocationId}>
            <option value="" disabled>Select destination...</option>
            {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
          </select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Target Travel Date">
          <input className={inputClass} name="travelDate" type="date" defaultValue={initialDate} required />
        </Field>
        <Field label="Total Passengers" hint="Number of travelers in your group">
          <input className={inputClass} name="passengerCount" type="number" min="1" max="100" defaultValue={initialPassengers || 1} required />
        </Field>
      </div>

      <Field label="Associated Travel Event (Optional)">
        <select className={inputClass} name="eventId" defaultValue="">
          <option value="">General service / None</option>
          {events.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}
        </select>
      </Field>

      <Field label="Special Requests or Notes">
        <textarea className={`${inputClass} h-20 py-2`} name="note" placeholder="e.g. luggage requirements, preferred departure time" />
      </Field>

      <SubmitButton>Submit travel demand</SubmitButton>
    </form>
  );
}
