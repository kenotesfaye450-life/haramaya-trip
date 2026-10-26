import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth";
import { AppError, formatErrorResponse, logError } from "@/lib/errors";
import { submitPaymentProof } from "@/lib/payment-proofs";

export async function POST(request: NextRequest) {
  try {
    const account = await getCurrentAccount();
    if (!account) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      throw new AppError("The upload request is malformed.", 400);
    }

    const bookingId = formData.get("bookingId");
    const file = formData.get("file");
    if (typeof bookingId !== "string" || !(file instanceof File)) {
      throw new AppError("Booking ID and image file are required.", 400);
    }

    const booking = await submitPaymentProof(account, bookingId, file);
    return NextResponse.json({
      success: true,
      message: "Payment proof uploaded successfully",
      booking: {
        id: booking.id,
        reference: booking.reference,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
      },
    });
  } catch (error) {
    logError(error, { route: "/api/bookings/upload-proof" });
    const formatted = formatErrorResponse(error);
    return NextResponse.json(
      { error: formatted.error },
      { status: formatted.statusCode },
    );
  }
}
