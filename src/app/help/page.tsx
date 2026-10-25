import Link from "next/link";
import { FullBrandLogo } from "@/components/brand-logo";

const faqs = [
  {
    question: "How do I book a trip?",
    answer: "Choose a published trip, enter each passenger’s details, and submit the booking. One account can book for several passengers.",
  },
  {
    question: "How does payment work?",
    answer: "Payment is manual. Use the current payment details provided by University Transport, upload proof, then wait for an administrator to approve or reject it. A confirmed ticket is issued after approval.",
  },
  {
    question: "What do I show at departure?",
    answer: "Show your ticket to staff and present the physical identity document recorded in your booking. Staff verify the ticket and check in each passenger individually.",
  },
  {
    question: "Can I use my ticket without internet?",
    answer: "No. Staff verify tickets against the live system, so the ticket page and gate scanner need an internet connection. Offline ticket viewing is not supported yet.",
  },
  {
    question: "Can I cancel a booking?",
    answer: "Traveler cancellations are allowed at least 12 hours before departure. The system releases the seats and records a refund request for transport staff to handle.",
  },
  {
    question: "What if no trip is listed?",
    answer: "Submit a travel request with your route and date. Staff review the combined demand and decide whether to schedule a trip.",
  },
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <FullBrandLogo className="h-auto w-full max-w-[220px]" />
      <header className="border-b border-[#DCE4EC] pb-4">
        <h1 className="text-xl font-bold tracking-tight text-[#102A43]">Help</h1>
        <p className="mt-1 text-xs text-[#52677D]">Booking, payment, tickets, and departure.</p>
      </header>

      <section className="divide-y divide-[#DCE4EC] rounded-xl border border-[#DCE4EC] bg-white px-4 sm:px-5" aria-label="Frequently asked questions">
        {faqs.map(({ question, answer }) => (
          <details key={question} className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-[#102A43] [&::-webkit-details-marker]:hidden">
              {question}
              <span className="text-lg leading-none text-brand-green group-open:rotate-45" aria-hidden="true">+</span>
            </summary>
            <p className="mt-2 max-w-2xl pr-6 text-xs leading-relaxed text-[#52677D]">{answer}</p>
          </details>
        ))}
      </section>

      <nav className="flex flex-wrap gap-2" aria-label="Travel actions">
        <Link href="/trips" className="rounded-lg bg-brand-green px-4 py-2 text-xs font-semibold text-white hover:bg-[#064E3B]">Find transport</Link>
        <Link href="/demand" className="rounded-lg border border-[#DCE4EC] bg-white px-4 py-2 text-xs font-semibold text-[#102A43] hover:bg-[#F4F8FC]">Request a trip</Link>
      </nav>
    </div>
  );
}
