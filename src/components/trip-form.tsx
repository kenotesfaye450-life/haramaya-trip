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
  originLocationId?: string;
  destinationLocationId?: string;
  purposeId?: string;
  status?: string;
  eventId?: string | null;
  notes?: string | null;
};

export function TripForm({
  locations,
  purposes,
  vehicles,
  events,
  initialFromLocationId,
  initialToLocationId,
  initialDepartureDate,
  tripToEdit,
}: {
  locations: Array<{ id: string; name: string }>;
  purposes: Array<{ id: string; name: string }>;
  vehicles: Array<{ id: string; name: string; plateNumber: string; seatCapacity: number }>;
  events: Array<{ id: string; name: string }>;
  initialFromLocationId?: string;
  initialToLocationId?: string;
  initialDepartureDate?: string;
  tripToEdit?: TripFormDraft;
}) {
  const [state, action] = useActionState(saveTripAction, null);
  const [selectedVehicleId, setSelectedVehicleId] = useState(tripToEdit?.vehicleId ?? "");
  const [capacity, setCapacity] = useState(tripToEdit?.seatCapacity ?? 60);

  const handleVehicleChange = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    const found = vehicles.find((vehicle) => vehicle.id === vehicleId);
    if (found) setCapacity(found.seatCapacity);
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
      {state && "ok" in state && state.ok ? <Alert tone="success">Trip saved successfully.</Alert> : null}

      <Field label="Trip Purpose">
        <select className={inputClass} name="purposeId" defaultValue={tripToEdit?.purposeId ?? ""} required>
          <option value="" disabled>Select purpose...</option>
          {purposes.map((purpose) => <option key={purpose.id} value={purpose.id}>{purpose.name}</option>)}
        </select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="From">
          <select className={inputClass} name="originLocationId" defaultValue={tripToEdit?.originLocationId ?? initialFromLocationId ?? ""} required>
            <option value="" disabled>Select origin...</option>
            {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
          </select>
        </Field>
        <Field label="Destination">
          <select className={inputClass} name="destinationLocationId" defaultValue={tripToEdit?.destinationLocationId ?? initialToLocationId ?? ""} required>
            <option value="" disabled>Select destination...</option>
            {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
          </select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Departure Date & Time">
          <input className={inputClass} name="departureAt" type="datetime-local" defaultValue={defaultDeparture} required />
        </Field>
        <Field label="Estimated Arrival Date & Time (Optional)">
          <input className={inputClass} name="arrivalAt" type="datetime-local" defaultValue={tripToEdit?.arrivalAt ? new Date(tripToEdit.arrivalAt).toISOString().slice(0, 16) : ""} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Assigned Fleet Vehicle">
          <select className={inputClass} name="vehicleId" value={selectedVehicleId} onChange={(event) => handleVehicleChange(event.target.value)}>
            <option value="">Unassigned (Set later)</option>
            {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.name} ({vehicle.plateNumber}) — {vehicle.seatCapacity} seats</option>)}
          </select>
        </Field>
        <Field label="Seat Capacity" hint="Cannot exceed assigned vehicle capacity">
          <input className={inputClass} name="seatCapacity" type="number" min="1" value={capacity} onChange={(event) => setCapacity(Number(event.target.value))} required />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Fare Per Seat (ETB)">
          <input className={inputClass} name="farePerSeat" type="number" min="0" defaultValue={tripToEdit?.farePerSeat ?? 450} required />
        </Field>
        <Field label="Booking Deadline (Optional)">
          <input className={inputClass} name="bookingDeadline" type="datetime-local" defaultValue={tripToEdit?.bookingDeadline ? new Date(tripToEdit.bookingDeadline).toISOString().slice(0, 16) : ""} />
        </Field>
        <Field label="Trip Status" hint="New trips start as drafts; publish them when ready.">
          <select className={inputClass} name="status" defaultValue={tripToEdit?.status ?? "DRAFT"} required>
            {Object.entries(TRIP_STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Travel Event (Optional)">
          <select className={inputClass} name="eventId" defaultValue={tripToEdit?.eventId ?? ""}>
            <option value="">No associated event</option>
            {events.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}
          </select>
        </Field>
        <Field label="Operational Notes (Optional)">
          <input className={inputClass} name="notes" defaultValue={tripToEdit?.notes ?? ""} placeholder="Departure details" />
        </Field>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <SubmitButton pendingText="Saving trip…">
          {tripToEdit ? "Update Trip" : "Schedule Trip"}
        </SubmitButton>
        <Link href="/admin/trips" className="rounded-lg border border-[#E3E8E5] px-3 py-2 text-xs text-[#66706A] hover:text-[#0A0A0A]">Cancel</Link>
      </div>
    </form>
  );
}
