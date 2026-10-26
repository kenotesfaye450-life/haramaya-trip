import { getCurrentAccount } from "@/lib/auth";
import { redirect } from "next/navigation";
import { orm } from "@/lib/db";
import { DigitalTicket } from "@/components/passenger/digital-ticket";
import { encodeTicketPayload } from "@/lib/tickets";
import { authPageHref } from "@/lib/return-to";

export const dynamic = "force-dynamic";

export default async function TicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const account = await getCurrentAccount();
  if (!account) {
    redirect(authPageHref("login", "/bookings/" + encodeURIComponent(id) + "/ticket"));
  }

  const booking = await orm.Booking.where({
    id,
    accountId: account.id,
    status: "CONFIRMED",
    paymentStatus: "APPROVED",
  })
    .include("trip", (t) =>
      t.include("route", (r) =>
        r.include("originLocation").include("destinationLocation")
      ).include("vehicle")
    )
    .include("passengers", (p) =>
      p.include("ticket").orderBy((passenger) => passenger.createdAt.asc())
    )
    .first();

  if (!booking) {
    redirect("/bookings");
  }

  const ticketQrValues = Object.fromEntries(
    booking.passengers.flatMap((passenger) =>
      passenger.ticket
        ? [[
            passenger.id,
            encodeTicketPayload({
              v: 1,
              ticketId: passenger.ticket.id,
              passengerId: passenger.id,
            }),
          ]]
        : []
    )
  );

  return (
    <div className="max-w-2xl mx-auto">
      <DigitalTicket booking={booking} ticketQrValues={ticketQrValues} />
    </div>
  );
}
