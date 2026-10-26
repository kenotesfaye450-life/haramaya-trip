"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

interface PaymentInstructionsProps {
  bookingReference: string;
  amount: number;
  bookingId: string;
}

export function PaymentInstructions({
  bookingReference,
  amount,
  bookingId,
}: PaymentInstructionsProps) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("File size exceeds 5MB limit");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      setError("Please select a JPG, PNG, WebP, or PDF file");
      return;
    }

    setSelectedFile(file);
    setError(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please choose a receipt screenshot or document first");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("bookingId", bookingId);

      const response = await fetch("/api/bookings/upload-proof", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Upload failed");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload receipt");
      setUploading(false);
    }
  };

  return (
    <div className="bg-white border border-[#DCE4EC] rounded-xl p-4 sm:p-5 space-y-4">
      <div className="border-b border-[#DCE4EC] pb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#102A43]">Amount to pay</h2>
          <p className="mt-1 max-w-md text-xs text-[#52677D]">
            Manual payment. Submit your receipt after transferring the exact amount.
          </p>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-[#71859A] uppercase font-semibold tracking-wider">Amount due</div>
          <div className="text-lg font-bold font-mono text-[#102A43] tabular-nums">
            ETB {amount}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#F4F8FC] px-3 py-2 text-xs">
        <span className="font-medium text-[#52677D]">Booking reference</span>
        <code className="font-mono font-semibold text-[#102A43]">{bookingReference}</code>
      </div>

      <div className="rounded-lg border border-[#DCE4EC] bg-[#F8FAFC] px-3 py-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-[#647A91]">Payment destination</div>
        <p className="mt-1 text-xs leading-relaxed text-[#52677D]">
          Account details are issued by University Transport and are not configured in this app. Verify the destination before transferring.
        </p>
      </div>

      {/* Proof Upload Area */}
      <div className="space-y-3 pt-1">
        <label htmlFor="payment-receipt" className="block text-xs font-semibold text-[#344B63]">
          Upload payment receipt
        </label>
        <p className="text-[11px] text-[#647A91]">
          If you refresh before submitting, select the receipt again. Browsers do not keep selected files between visits.
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input
            id="payment-receipt"
            type="file"
            accept="image/png,image/jpeg,image/webp,application/pdf"
            onChange={handleFileSelect}
            className="min-w-0 flex-1 text-xs text-[#52677D] file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#E7F0FA] file:text-[#102A43] hover:file:bg-[#D8E8F6] file:cursor-pointer cursor-pointer"
          />

          <Button
            type="button"
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            size="default"
            className="flex-shrink-0 font-bold shadow-xs"
          >
            {uploading ? "Submitting…" : "Submit for review"}
          </Button>
        </div>

        {selectedFile && (
          <div className="min-w-0 text-xs text-brand-green font-medium flex items-center gap-2">
            <span className="truncate">{selectedFile.name}</span>
            <span className="shrink-0 text-[#52677D]">{(selectedFile.size / 1024).toFixed(1)} KB</span>
          </div>
        )}

        {error && <Alert variant="error">{error}</Alert>}
      </div>
    </div>
  );
}
