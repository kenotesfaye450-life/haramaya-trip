"use client";

import { cancelBookingAction } from "@/lib/actions/booking";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Dialog } from "@/components/ui/dialog";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleCancel = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setError(null);
    try {
      const result = await cancelBookingAction(bookingId);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setShowConfirmation(false);
      setSuccess("Booking cancelled and reserved seats released.");
      router.refresh();
    } catch {
      setError("Unable to cancel this booking. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-2">
      {error && !showConfirmation ? <Alert variant="error">{error}</Alert> : null}
      {success ? (
        <Alert variant="success">
          <div className="flex items-start justify-between gap-3">
            <span>{success}</span>
            <button
              type="button"
              onClick={() => setSuccess(null)}
              aria-label="Dismiss booking status"
              className="touch-target -my-1 rounded px-2 text-base leading-none hover:bg-black/5"
            >
              ×
            </button>
          </div>
        </Alert>
      ) : null}
      <Button
        variant="danger"
        onClick={() => {
          setError(null);
          setShowConfirmation(true);
        }}
        disabled={isProcessing}
        aria-busy={isProcessing || undefined}
        size="sm"
      >
        Cancel booking
      </Button>

      {showConfirmation ? (
        <Dialog
          title="Cancel this booking?"
          description="This will cancel the booking and release its reserved seats. This action cannot be undone."
          onClose={() => {
            if (!isProcessing) {
              setShowConfirmation(false);
              setError(null);
            }
          }}
        >
          {error ? <Alert variant="error" className="mb-4">{error}</Alert> : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="neutral"
              onClick={() => {
                setShowConfirmation(false);
                setError(null);
              }}
              disabled={isProcessing}
            >
              Keep booking
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleCancel()}
              disabled={isProcessing}
              aria-busy={isProcessing || undefined}
            >
              {isProcessing ? "Cancelling…" : "Confirm cancellation"}
            </Button>
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}
