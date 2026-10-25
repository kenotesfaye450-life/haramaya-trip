import { orm } from "@/lib/db";

export function tripQuery() {
  return orm.Trip.include("route", (route) =>
    route.include("originCampus").include("destination"),
  )
    .include("vehicle")
    .include("event");
}

export function bookingQuery() {
  return orm.Booking.include("trip", (trip) =>
    trip
      .include("route", (route) => route.include("originCampus").include("destination"))
      .include("vehicle"),
  )
    .include("passengers", (p) => p.include("ticket"))
    .include("proofs")
    .include("tickets")
    .include("account")
    .include("reviewedBy");
}
