const STAGES = ["Trip", "Passengers", "Payment", "Ticket"] as const;

export function BookingProgress({ current }: { current: (typeof STAGES)[number] }) {
  const currentIndex = STAGES.indexOf(current);

  return (
    <nav aria-label="Booking progress" className="rounded-xl border border-[#DCE4EC] bg-white px-3 py-3 sm:px-5">
      <ol className="grid grid-cols-4">
        {STAGES.map((stage, index) => {
          const complete = index < currentIndex;
          const active = index === currentIndex;

          return (
            <li key={stage} className="relative flex min-w-0 flex-col items-center gap-1.5">
              {index < STAGES.length - 1 && (
                <span
                  aria-hidden="true"
                  className={`absolute left-1/2 top-3.5 h-px w-full ${index < currentIndex ? "bg-brand-green" : "bg-[#DCE4EC]"}`}
                />
              )}
              <span
                aria-current={active ? "step" : undefined}
                className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold ${
                  complete || active
                    ? "bg-brand-green text-white"
                    : "border border-[#DCE4EC] bg-white text-[#71859A]"
                }`}
              >
                {complete ? "✓" : index + 1}
              </span>
              <span className={`text-[10px] font-semibold sm:text-xs ${active ? "text-brand-green" : complete ? "text-[#344B63]" : "text-[#71859A]"}`}>
                {stage}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
