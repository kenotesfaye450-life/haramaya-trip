import { getCurrentAccount } from "@/lib/auth";
import { redirect } from "next/navigation";
import { orm } from "@/lib/db";
import { BookingDetail } from "@/components/passenger/booking-detail";

export const dynamic = "force-dynamic";

export default async function BookingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const account = await getCurrentAccount();
  if (!account) {
    redirect("/login");
  }

  const { id } = await params;
  const search = await searchParams;

  const booking = await orm.Booking.where({ id, accountId: account.id })
    .include("trip", (t) =>
      t.include("route", (r) =>
        r.include("originCampus").include("destination")
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
