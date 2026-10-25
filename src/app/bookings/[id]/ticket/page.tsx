import { getCurrentAccount } from "@/lib/auth";
import { redirect } from "next/navigation";
import { orm } from "@/lib/db";
import { DigitalTicket } from "@/components/passenger/digital-ticket";
import { encodeTicketPayload } from "@/lib/tickets";

export const dynamic = "force-dynamic";

export default async function TicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const account = await getCurrentAccount();
  if (!account) {
    redirect("/login");
  }

  const { id } = await params;

  const booking = await orm.Booking.where({
    id,
    accountId: account.id,
    status: "CONFIRMED",
    paymentStatus: "APPROVED", // Only show ticket if approved
  })
    .include("trip", (t) =>
      t.include("route", (r) =>
        r.include("originCampus").include("destination")
      ).include("vehicle")
    )
    .include("passengers", (p) =>
      p.include("ticket").orderBy((passenger) => passenger.createdAt.asc()),
    )
    .first();

  if (!booking) {
    redirect("/bookings");
  }

  const ticketQrValues = Object.fromEntries(
    booking.passengers.flatMap((passenger) =>
      passenger.ticket
        ? [[passenger.id, encodeTicketPayload({ v: 1, ticketId: passenger.ticket.id, passengerId: passenger.id })]]
        : [],
    ),
  );

  return (
    <div className="max-w-2xl mx-auto">
      <DigitalTicket booking={booking} ticketQrValues={ticketQrValues} />
    </div>
  );
}
