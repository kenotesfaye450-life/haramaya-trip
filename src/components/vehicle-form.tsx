"use client";

import { saveVehicleAction } from "@/lib/actions/admin";
import { Alert, Field, inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/form-status";
import { useActionState } from "react";
import Link from "next/link";

type VehicleFormDraft = {
  id?: string;
  name?: string;
  plateNumber?: string;
  seatCapacity?: number;
  isActive?: boolean;
};

export function VehicleForm({ vehicleToEdit }: { vehicleToEdit?: VehicleFormDraft }) {
  const [state, action] = useActionState(saveVehicleAction, null);
  return (
    <form action={action} className="space-y-4">
      {vehicleToEdit?.id ? <input type="hidden" name="id" value={vehicleToEdit.id} /> : null}
      {state?.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state && "ok" in state && state.ok ? <Alert tone="success">Vehicle saved successfully.</Alert> : null}

      <Field label="Vehicle Name & Model">
        <input
          className={inputClass}
          name="name"
          defaultValue={vehicleToEdit?.name ?? ""}
          placeholder="e.g. HU Bus 04 (Higer)"
          required
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Plate Number">
          <input
            className={inputClass}
            name="plateNumber"
            defaultValue={vehicleToEdit?.plateNumber ?? ""}
            placeholder="e.g. ET-3-1004"
            required
          />
        </Field>

        <Field label="Seating Capacity">
          <input
            className={inputClass}
            name="seatCapacity"
            type="number"
            min="1"
            max="120"
            defaultValue={vehicleToEdit?.seatCapacity ?? 60}
            required
          />
        </Field>
      </div>

      {vehicleToEdit?.id && (
        <label className="flex items-center gap-2 text-xs pt-1">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={vehicleToEdit.isActive !== false}
            className="rounded border-[#E3E8E5] text-brand-green focus:ring-brand-green"
          />
          <span className="font-semibold text-[#171717]">In Service (Active for trip assignment)</span>
        </label>
      )}

      <div className="flex items-center gap-2 pt-2">
        <SubmitButton pendingText="Saving vehicle…">
          {vehicleToEdit ? "Update Vehicle" : "Add Vehicle"}
        </SubmitButton>
        {vehicleToEdit && (
          <Link
            href="/admin/vehicles"
            className="text-xs text-[#66706A] hover:text-[#0A0A0A] px-3 py-2 rounded-lg border border-[#E3E8E5]"
          >
            Cancel
          </Link>
        )}
      </div>
    </form>
  );
}