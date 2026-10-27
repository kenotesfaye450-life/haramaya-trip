import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth";
import { AppError, formatErrorResponse } from "@/lib/errors";
import { submitPaymentProof } from "@/lib/payment-proofs";

export async function POST(request: NextRequest) {
  let stage = "authentication";
  try {
    const account = await getCurrentAccount();
    if (!account) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    stage = "multipart_parsing";
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

    stage = "proof_submission";
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
    if (stage !== "proof_submission") {
      console.error("Payment-proof upload request failed.", {
        stage,
        errorName:
          error instanceof Error && /^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(error.name)
            ? error.name
            : "Unknown",
        statusCode: error instanceof AppError ? error.statusCode : undefined,
      });
    }
    const formatted =
      error instanceof AppError
        ? formatErrorResponse(error)
        : { error: "Unable to submit the payment proof. Please try again.", statusCode: 500 };
    return NextResponse.json(
      { error: formatted.error },
      { status: formatted.statusCode },
    );
  }
}
