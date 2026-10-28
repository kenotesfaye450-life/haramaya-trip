"use client";

import { useEffect, type ReactNode } from "react";

export function Dialog({
  title,
  description,
  onClose,
  children,
  className = "max-w-lg",
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/45 p-3 sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby={description ? "dialog-description" : undefined}
        className={`mx-auto my-4 max-h-[calc(100dvh-2rem)] w-full overflow-y-auto rounded-xl bg-white p-4 shadow-2xl sm:my-10 sm:p-6 ${className}`}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id="dialog-title" className="text-lg font-bold text-[#102A43]">
              {title}
            </h2>
            {description ? (
              <p id="dialog-description" className="mt-1 text-sm text-[#52677D]">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="touch-target shrink-0 rounded-md px-2 py-1 text-xl leading-none text-[#52677D] hover:bg-[#F4F8FC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green"
          >
            ×
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
