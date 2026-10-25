import { NextRequest, NextResponse } from "next/server";
import { orm } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { decodeTicketPayload } from "@/lib/tickets";

export async function POST(request: NextRequest) {
  try {
    await requireRole("STAFF", "ADMIN");

    const body = await request.json();
    const { tripId, ticketCode } = body;

    if (!tripId || !ticketCode) {
      return NextResponse.json(
        { error: "Trip ID and ticket verification code are required." },
        { status: 400 }
      );
    }

    const rawCode = String(ticketCode).trim();
    let bookingReference = "";
    let targetPassengerId: string | null = null;
    let targetPassengerIndex: number | null = null;
    let booking;

    // QR tickets use a server-signed payload and must resolve to an issued database ticket.
    const signedPayload = decodeTicketPayload(rawCode);
    if (signedPayload) {
      const ticket = await orm.Ticket.where({ id: signedPayload.ticketId })
        .include("booking", (b) =>
          b
            .include("trip", (t) =>
              t
                .include("route", (r) => r.include("originCampus").include("destination"))
                .include("vehicle"),
            )
            .include("passengers"),
        )
        .first();

      if (!ticket || ticket.passengerId !== signedPayload.passengerId) {
        return NextResponse.json({ error: "INVALID TICKET: No issued ticket matches this QR code." }, { status: 404 });
      }
      booking = ticket.booking;
      targetPassengerId = ticket.passengerId;
    } else if (rawCode.startsWith("{") || rawCode.split(".").length === 4) {
      return NextResponse.json({ error: "INVALID TICKET: QR signature is missing or invalid." }, { status: 400 });
    }

    // Manual staff lookup supports the issued backup code and booking reference.
    if (!booking) {
      const pMatch = rawCode.match(/^([A-Z0-9-]+?)-P(\d+)$/i);
      if (pMatch) {
        bookingReference = pMatch[1].toUpperCase();
        targetPassengerIndex = parseInt(pMatch[2], 10) - 1;
      } else {
        bookingReference = rawCode.toUpperCase().replace(/\s+/g, "");
      }
    }

    // Find a booking by reference for manual lookup.
    if (!booking) {
      booking = await orm.Booking.where({ reference: bookingReference })
        .include("trip", (t) =>
          t
            .include("route", (r) => r.include("originCampus").include("destination"))
            .include("vehicle"),
        )
        .include("passengers")
        .first();
    }

    if (!booking && !bookingReference.includes("-")) {
      // Try finding by inserting hyphen e.g. HUT82KF -> HUT-82KF
      const allBookings = await orm.Booking.include("trip", (t) =>
        t
          .include("route", (r) =>
            r.include("originCampus").include("destination")
          )
          .include("vehicle")
      )
        .include("passengers")
        .all();

      booking =
        allBookings.find(
          (b) => b.reference.replace("-", "").toUpperCase() === bookingReference
        ) || null;
    }

    // If still not found, check whether this is a ticket's short backup code.
    if (!booking) {
      const ticketRecord = await orm.Ticket.where({ publicCode: bookingReference })
        .include("booking", (b) =>
          b
            .include("trip", (t) =>
              t
                .include("route", (r) =>
                  r.include("originCampus").include("destination")
                )
                .include("vehicle")
            )
            .include("passengers")
        )
        .first();

      if (ticketRecord && ticketRecord.booking) {
        booking = ticketRecord.booking;
        targetPassengerId = ticketRecord.passengerId;
      }
    }

    if (!booking) {
      return NextResponse.json(
        {
          error:
            "INVALID TICKET: Ticket code or booking reference was not recognized in the system.",
        },
        { status: 404 }
      );
    }

    // 4. Validate Booking Lifecycle
    if (booking.status === "CANCELLED") {
      return NextResponse.json(
        { error: "INVALID TICKET: This reservation has been cancelled." },
        { status: 400 }
      );
    }

    if (
      booking.status === "REJECTED" ||
      booking.paymentStatus === "REJECTED"
    ) {
      return NextResponse.json(
        {
          error:
            "INVALID TICKET: Payment was rejected. Boarding pass is not valid.",
        },
        { status: 400 }
      );
    }

    if (
      booking.paymentStatus !== "APPROVED" ||
      booking.status !== "CONFIRMED"
    ) {
      return NextResponse.json(
        {
          error: `INVALID TICKET: Payment is ${booking.paymentStatus.toLowerCase()}. Only confirmed tickets are valid for departure.`,
        },
        { status: 400 }
      );
    }

    // 5. Critical WRONG TRIP Protection (Requirement 22)
    if (booking.tripId !== tripId) {
      const bookedRouteName =
        booking.trip?.route?.name ||
        `${booking.trip?.route?.originCampus?.name || "Campus"} → ${
          booking.trip?.route?.destination?.name || "Destination"
        }`;
      const bookedTimeStr = booking.trip
        ? new Date(booking.trip.departureAt).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })
        : "another time";
      const bookedDateStr = booking.trip
        ? new Date(booking.trip.departureAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })
        : "";

      return NextResponse.json(
        {
          error: `WRONG TRIP: This ticket is for ${bookedRouteName} (${bookedDateStr} at ${bookedTimeStr}), not for the current departure.`,
        },
        { status: 400 }
      );
    }

    // 6. Return group booking details and all passengers in this reservation (Requirement 23)
    const passengers = (booking.passengers || []).map((p, idx) => ({
      id: p.id,
      fullName: p.fullName,
      identityType: p.identityType,
      identityNumber: p.identityNumber,
      checkInStatus: p.checkInStatus,
      checkedInAt: p.checkedInAt,
      isTarget:
        (targetPassengerId && p.id === targetPassengerId) ||
        (targetPassengerIndex !== null && idx === targetPassengerIndex),
    }));

    const tripDeparture = booking.trip ? new Date(booking.trip.departureAt) : null;

    return NextResponse.json({
      valid: true,
      booking: {
        id: booking.id,
        reference: booking.reference,
        partySize: booking.partySize,
        route: booking.trip?.route
          ? `${booking.trip.route.originCampus?.name} → ${booking.trip.route.destination?.name}`
          : "Scheduled Route",
        departureTime: tripDeparture
          ? tripDeparture.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })
          : "TBA",
        departureDate: tripDeparture
          ? tripDeparture.toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })
          : "",
        vehicle: booking.trip?.vehicle
          ? `${booking.trip.vehicle.name} (${booking.trip.vehicle.plateNumber})`
          : null,
      },
      passengers,
    });
  } catch (error) {
    console.error("Ticket verification error:", error);
    return NextResponse.json(
      { error: "Server error occurred during ticket verification." },
      { status: 500 }
    );
  }
}
