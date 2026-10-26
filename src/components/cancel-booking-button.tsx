"use client";

import { cancelBookingAction } from "@/lib/actions/booking";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { useState, useTransition } from "react";

export function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleCancel = () => {
    if (confirm("Are you sure you want to cancel this booking? This will release reserved seats.")) {
      setError(null);
      startTransition(async () => {
        const result = await cancelBookingAction(bookingId);
        if (result?.error) setError(result.error);
      });
    }
  };

  return (
    <div className="space-y-2">
      {error ? <Alert variant="error">{error}</Alert> : null}
      <Button
        variant="danger"
        onClick={handleCancel}
        disabled={isPending}
        aria-busy={isPending || undefined}
        size="sm"
      >
        {isPending ? "Cancelling…" : "Cancel booking"}
      </Button>
    </div>
  );
}
