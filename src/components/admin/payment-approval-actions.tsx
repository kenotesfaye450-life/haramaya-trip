"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

interface PaymentApprovalActionsProps {
  bookingId: string;
  bookingReference: string;
  amount: number;
}

export function PaymentApprovalActions({
  bookingId,
  bookingReference,
  amount,
}: PaymentApprovalActionsProps) {
  const router = useRouter();
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async () => {
    if (
      !confirm(
        `Approve payment of ETB ${amount} for booking ${bookingReference}?\n\nThis will confirm the seats and issue the passenger's digital ticket.`
      )
    ) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/approve-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Approval failed");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval failed");
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setError("Please specify why the payment is being rejected");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/reject-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, reason: rejectionReason.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Rejection failed");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rejection failed");
      setIsProcessing(false);
    }
  };

  if (showRejectForm) {
    return (
      <div className="space-y-3 bg-[#FEF2F2]/50 border border-[#FECACA] rounded-xl p-3.5 text-xs text-left">
        <div className="font-semibold text-[#991B1B]">
          Reason for Rejecting {bookingReference}
        </div>
        <Input
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          placeholder="e.g. Unclear screenshot, incorrect transfer amount, invalid memo"
          required
        />
        {error && <Alert variant="error">{error}</Alert>}
        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            variant="destructive"
            onClick={handleReject}
            disabled={isProcessing}
            className="shadow-xs font-semibold"
          >
            {isProcessing ? "Rejecting..." : "Confirm Rejection"}
          </Button>
          <Button
            size="sm"
            variant="neutral"
            onClick={() => {
              setShowRejectForm(false);
              setError(null);
            }}
            disabled={isProcessing}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error && <Alert variant="error">{error}</Alert>}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={handleApprove}
          disabled={isProcessing}
          aria-busy={isProcessing || undefined}
          className="font-bold shadow-xs"
        >
          {isProcessing ? "Approving..." : "Approve Payment"}
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => setShowRejectForm(true)}
          disabled={isProcessing}
          aria-busy={isProcessing || undefined}
        >
          Reject
        </Button>
      </div>
    </div>
  );
}
