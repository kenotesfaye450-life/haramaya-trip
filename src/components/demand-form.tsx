"use client";

import { submitDemandAction } from "@/lib/actions/demand";
import { Alert, Field, inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/form-status";
import { useActionState } from "react";

export function DemandForm({
  routes,
  events,
  initialRouteId = "",
  initialDate = "",
  initialPassengers = 1,
}: {
  routes: Array<{ id: string; name: string; originCampusName: string; destinationName: string }>;
  events: Array<{ id: string; name: string }>;
  initialRouteId?: string;
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

      <Field label="Desired Route">
        <select className={inputClass} name="routeId" required defaultValue={initialRouteId || ""}>
          <option value="" disabled>Select route...</option>
          {routes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} ({r.originCampusName} → {r.destinationName})
            </option>
          ))}
        </select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Target Travel Date">
          <input
            className={inputClass}
            name="travelDate"
            type="date"
            defaultValue={initialDate || ""}
            required
          />
        </Field>

        <Field label="Total Passengers" hint="Number of travelers in your group">
          <input
            className={inputClass}
            name="passengerCount"
            type="number"
            min="1"
            max="100"
            defaultValue={initialPassengers || 1}
            required
          />
        </Field>
      </div>

      <Field label="Associated Travel Event (Optional)">
        <select className={inputClass} name="eventId" defaultValue="">
          <option value="">General service / None</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Special Requests or Notes">
        <textarea
          className={`${inputClass} h-20 py-2`}
          name="note"
          placeholder="e.g. luggage requirements, preferred morning or afternoon departure"
        />
      </Field>

      <SubmitButton>Submit travel demand</SubmitButton>
    </form>
  );
}
