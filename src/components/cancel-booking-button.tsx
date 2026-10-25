"use client";

import { cancelBookingAction } from "@/lib/actions/booking";
import { Button } from "@/components/ui";
import { useTransition } from "react";

export function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const [isPending, startTransition] = useTransition();

  const handleCancel = () => {
    if (confirm("Are you sure you want to cancel this booking? This will release reserved seats.")) {
      startTransition(async () => {
        await cancelBookingAction(bookingId);
      });
    }
  };

  return (
    <Button
      variant="danger"
      onClick={handleCancel}
      disabled={isPending}
      className="text-xs"
    >
      {isPending ? "Cancelling..." : "Cancel booking"}
    </Button>
  );
}
