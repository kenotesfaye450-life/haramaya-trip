"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Dialog } from "@/components/ui/dialog";

interface PaymentApprovalActionsProps {
  bookingId: string;
  bookingReference: string;
  amount: number;
}

type Decision = "approve" | "reject";

export function PaymentApprovalActions({
  bookingId,
  bookingReference,
  amount,
}: PaymentApprovalActionsProps) {
  const router = useRouter();
  const [dialog, setDialog] = useState<Decision | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    },
    [],
  );

  const closeDialog = () => {
    if (isProcessing) return;
    setDialog(null);
    setError(null);
  };

  const submitDecision = async (decision: Decision) => {
    if (decision === "reject" && rejectionReason.trim().length < 5) {
      setError("Enter a rejection reason of at least 5 characters.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch(
        decision === "approve"
          ? "/api/admin/approve-payment"
          : "/api/admin/reject-payment",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingId,
            ...(decision === "reject" ? { reason: rejectionReason.trim() } : {}),
          }),
        },
      );
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setError(
          typeof result?.error === "string"
            ? result.error
            : `Unable to ${decision} this payment. Please try again.`,
        );
        return;
      }

      setDialog(null);
      setRejectionReason("");
      setSuccess(
        decision === "approve"
          ? "Payment approved and tickets issued."
          : "Payment rejected. The traveler can submit a replacement proof before the deadline.",
      );
      refreshTimer.current = setTimeout(() => router.refresh(), 1200);
    } catch {
      setError(`Unable to ${decision} this payment. Check your connection and try again.`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-2 text-left">
      {error && !dialog ? <Alert variant="error">{error}</Alert> : null}
      {success ? (
        <Alert variant="success">
          <div className="flex items-start justify-between gap-3">
            <span>{success}</span>
            <button
              type="button"
              onClick={() => setSuccess(null)}
              aria-label="Dismiss payment status"
              className="touch-target -my-1 rounded px-2 text-base leading-none hover:bg-black/5"
            >
              ×
            </button>
          </div>
        </Alert>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          onClick={() => {
            setError(null);
            setDialog("approve");
          }}
          disabled={isProcessing}
          aria-busy={isProcessing || undefined}
          className="font-bold shadow-xs"
        >
          Approve Payment
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => {
            setError(null);
            setDialog("reject");
          }}
          disabled={isProcessing}
        >
          Reject
        </Button>
      </div>

      {dialog === "approve" ? (
        <Dialog
          title="Approve payment?"
          description={`Approve ETB ${amount} for booking ${bookingReference}? This confirms the seats and issues passenger tickets.`}
          onClose={closeDialog}
        >
          {error ? <Alert variant="error" className="mb-4">{error}</Alert> : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="neutral" onClick={closeDialog} disabled={isProcessing}>
              Cancel
            </Button>
            <Button
              onClick={() => void submitDecision("approve")}
              disabled={isProcessing}
              aria-busy={isProcessing || undefined}
            >
              {isProcessing ? "Approving…" : "Approve payment"}
            </Button>
          </div>
        </Dialog>
      ) : null}

      {dialog === "reject" ? (
        <Dialog
          title="Reject payment proof"
          description={`Give the traveler a clear reason for rejecting booking ${bookingReference}.`}
          onClose={closeDialog}
        >
          <div className="space-y-4">
            <div>
              <Input
                label="Rejection reason"
                value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
                placeholder="For example, the transfer amount is unclear."
                required
                minLength={5}
                maxLength={1000}
                aria-describedby={error ? "payment-rejection-error" : undefined}
                aria-invalid={Boolean(error)}
                disabled={isProcessing}
              />
              {error ? (
                <p id="payment-rejection-error" className="mt-1 text-xs text-[#991B1B]" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="neutral" onClick={closeDialog} disabled={isProcessing}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => void submitDecision("reject")}
                disabled={isProcessing || rejectionReason.trim().length < 5}
                aria-busy={isProcessing || undefined}
              >
                {isProcessing ? "Rejecting…" : "Reject payment"}
              </Button>
            </div>
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}
