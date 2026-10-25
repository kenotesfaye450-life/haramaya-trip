"use client";

import { saveTripAction } from "@/lib/actions/admin";
import { Alert, Field, inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/form-status";
import { TRIP_STATUS_LABELS } from "@/lib/constants";
import { useActionState, useState } from "react";
import Link from "next/link";

type TripFormDraft = {
  id?: string;
  vehicleId?: string | null;
  seatCapacity?: number;
  farePerSeat?: number;
  departureAt?: string | null;
  arrivalAt?: string | null;
  bookingDeadline?: string | null;
  routeId?: string | null;
  status?: string;
  eventId?: string | null;
  notes?: string | null;
};

export function TripForm({
  routes,
  vehicles,
  events,
  initialRouteId,
  initialDepartureDate,
  tripToEdit,
}: {
  routes: Array<{ id: string; name: string }>;
  vehicles: Array<{ id: string; name: string; plateNumber: string; seatCapacity: number }>;
  events: Array<{ id: string; name: string }>;
  initialRouteId?: string;
  initialDepartureDate?: string;
  tripToEdit?: TripFormDraft;
}) {
  const [state, action] = useActionState(saveTripAction, null);
  const [selectedVehicleId, setSelectedVehicleId] = useState(tripToEdit?.vehicleId ?? "");
  const [capacity, setCapacity] = useState(tripToEdit?.seatCapacity ?? 60);

  const handleVehicleChange = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    const found = vehicles.find((v) => v.id === vehicleId);
    if (found) {
      setCapacity(found.seatCapacity);
    }
  };

  const defaultDeparture = tripToEdit?.departureAt
    ? new Date(tripToEdit.departureAt).toISOString().slice(0, 16)
    : initialDepartureDate
    ? `${initialDepartureDate}T08:00`
    : "";

  return (
    <form action={action} className="space-y-4">
      {tripToEdit?.id ? <input type="hidden" name="id" value={tripToEdit.id} /> : null}
      {state?.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state && "ok" in state && state.ok ? (
        <Alert tone="success">Trip saved successfully.</Alert>
      ) : null}

      <Field label="Route">
        <select
          className={inputClass}
          name="routeId"
          defaultValue={tripToEdit?.routeId ?? initialRouteId ?? ""}
          required
        >
          <option value="" disabled>Select route...</option>
          {routes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Departure Date & Time">
          <input
            className={inputClass}
            name="departureAt"
            type="datetime-local"
            defaultValue={defaultDeparture}
            required
          />
        </Field>

        <Field label="Estimated Arrival Date & Time (Optional)">
          <input
            className={inputClass}
            name="arrivalAt"
            type="datetime-local"
            defaultValue={
              tripToEdit?.arrivalAt
                ? new Date(tripToEdit.arrivalAt).toISOString().slice(0, 16)
                : ""
            }
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Assigned Fleet Vehicle">
          <select
            className={inputClass}
            name="vehicleId"
            value={selectedVehicleId}
            onChange={(e) => handleVehicleChange(e.target.value)}
          >
            <option value="">Unassigned (Set later)</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.plateNumber}) — {v.seatCapacity} seats
              </option>
            ))}
          </select>
        </Field>

        <Field label="Seat Capacity" hint="Determined by vehicle">
          <input
            className={inputClass}
            name="seatCapacity"
            type="number"
            min="1"
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
            required
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Fare Per Seat (ETB)">
          <input
            className={inputClass}
            name="farePerSeat"
            type="number"
            min="0"
            defaultValue={tripToEdit?.farePerSeat ?? 450}
            required
          />
        </Field>

        <Field label="Booking Deadline (Optional)">
          <input
            className={inputClass}
            name="bookingDeadline"
            type="datetime-local"
            defaultValue={
              tripToEdit?.bookingDeadline
                ? new Date(tripToEdit.bookingDeadline).toISOString().slice(0, 16)
                : ""
            }
          />
        </Field>

        <Field label="Trip Status">
          <select
            className={inputClass}
            name="status"
            defaultValue={tripToEdit?.status ?? "PUBLISHED"}
            required
          >
            {Object.entries(TRIP_STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Travel Event (Optional)">
          <select
            className={inputClass}
            name="eventId"
            defaultValue={tripToEdit?.eventId ?? ""}
          >
            <option value="">No associated event</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Operational Notes (Optional)">
          <input
            className={inputClass}
            name="notes"
            defaultValue={tripToEdit?.notes ?? ""}
            placeholder="e.g. Gathering at Main Campus Stadium, convoy departure"
          />
        </Field>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <SubmitButton>{tripToEdit ? "Update Trip" : "Schedule Trip"}</SubmitButton>
        <Link
          href="/admin/trips"
          className="text-xs text-[#66706A] hover:text-[#0A0A0A] px-3 py-2 rounded-lg border border-[#E3E8E5]"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}