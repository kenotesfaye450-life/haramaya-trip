"use client";

import Image from "next/image";
import { useState } from "react";

export function PaymentProofPreview({
  href,
  bookingReference,
}: {
  href: string;
  bookingReference: string;
}) {
  const [unavailable, setUnavailable] = useState(false);

  return (
    <figure className="min-w-0 space-y-2">
      {unavailable ? (
        <div
          className="flex aspect-[4/3] w-full max-w-56 items-center justify-center rounded-lg border border-[#DCE4EC] bg-[#F4F8FC] p-3 text-center text-xs text-[#52677D]"
          role="status"
        >
          Receipt preview is unavailable. Try opening the file.
        </div>
      ) : (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open full-size payment receipt for ${bookingReference}`}
          className="block w-full max-w-56 overflow-hidden rounded-lg border border-[#DCE4EC] bg-[#F4F8FC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green"
        >
          <Image
            src={href}
            alt={`Payment receipt for booking ${bookingReference}`}
            width={480}
            height={360}
            unoptimized
            loading="lazy"
            onError={() => setUnavailable(true)}
            className="aspect-[4/3] h-auto w-full object-contain"
          />
        </a>
      )}
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-9 items-center text-xs font-semibold text-[#2563EB] underline underline-offset-2 hover:text-[#1D4ED8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
      >
        Open full-size receipt
      </a>
    </figure>
  );
}
