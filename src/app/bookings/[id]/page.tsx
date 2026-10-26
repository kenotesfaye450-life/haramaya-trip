import { getCurrentAccount } from "@/lib/auth";
import { redirect } from "next/navigation";
import { orm } from "@/lib/db";
import { BookingDetail } from "@/components/passenger/booking-detail";
import { authPageHref } from "@/lib/return-to";

export const dynamic = "force-dynamic";

export default async function BookingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const account = await getCurrentAccount();
  if (!account) {
    redirect(authPageHref("login", "/bookings/" + encodeURIComponent(id)));
  }

  const search = await searchParams;
  const booking = await orm.Booking.where({ id, accountId: account.id })
    .include("trip", (t) =>
      t.include("route", (r) =>
        r.include("originLocation").include("destinationLocation")
      )
    )
    .include("passengers")
    .include("proofs")
    .first();

  if (!booking) {
    redirect("/bookings");
  }

  return (
    <div className="max-w-4xl mx-auto">
      <BookingDetail booking={booking} justCreated={search.created === "true"} />
    </div>
  );
}
