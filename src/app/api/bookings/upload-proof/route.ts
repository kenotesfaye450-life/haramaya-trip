import { NextRequest, NextResponse } from 'next/server';
import { orm } from '@/lib/db';
import { getCurrentAccount } from '@/lib/auth';
import { validateFileUpload } from '@/lib/validation';
import { ValidationError, NotFoundError, formatErrorResponse, logError } from '@/lib/errors';
import { writeAudit } from '@/lib/audit';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomToken } from '@/lib/crypto';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const account = await getCurrentAccount();
    if (!account) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const bookingId = formData.get('bookingId') as string;
    const file = formData.get('file');

    if (typeof bookingId !== 'string' || !(file instanceof File)) {
      throw new ValidationError('Booking ID and file are required');
    }

    // Validate file
    const fileValidation = validateFileUpload(file, {
      maxSizeBytes: 5 * 1024 * 1024,
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    });

    if (!fileValidation.valid) {
      throw new ValidationError('Invalid file', fileValidation.errors);
    }

    // Find booking
    const booking = await orm.Booking.where({ id: bookingId }).first();

    if (!booking) {
      throw new NotFoundError('Booking');
    }

    // Check ownership
    if (booking.accountId !== account.id && account.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if already has proof pending review
    if (!['PENDING_PAYMENT', 'REJECTED'].includes(booking.status)) {
      throw new ValidationError('Payment proof cannot be submitted for this booking state');
    }

    const extensionByType: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'application/pdf': '.pdf',
    };
    const storageKey = `${booking.id}/${randomToken(24)}${extensionByType[file.type]}`;

    const proofDirectory = path.join(process.cwd(), 'storage', 'proofs', booking.id);
    await mkdir(proofDirectory, { recursive: true });
    const bytes = Buffer.from(await file.arrayBuffer());
    const signatureMatches =
      (file.type === 'image/jpeg' && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) ||
      (file.type === 'image/png' && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) ||
      (file.type === 'image/webp' && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') ||
      (file.type === 'application/pdf' && bytes.toString('ascii', 0, 5) === '%PDF-');
    if (!signatureMatches) throw new ValidationError('The file contents do not match an accepted receipt format.');
    await writeFile(path.join(process.cwd(), 'storage', 'proofs', storageKey), bytes, { flag: 'wx' });

    await db.transaction(async (tx) => {
      const lockedBooking = await tx.orm.public.Booking.where({ id: booking.id }).forUpdate().first();
      if (!lockedBooking || !['PENDING_PAYMENT', 'REJECTED'].includes(lockedBooking.status)) {
        throw new ValidationError('Payment proof cannot be submitted for this booking state');
      }
      await tx.orm.public.PaymentProof.create({
        bookingId: booking.id,
        uploadedById: account.id,
        fileName: file.name.slice(0, 255),
        mimeType: file.type,
        storageKey,
      });
      await tx.orm.public.Booking.where({ id: booking.id }).update({
        status: 'PENDING_REVIEW',
        paymentStatus: 'SUBMITTED',
        rejectionReason: null,
      });
    });

    await writeAudit({
      actorId: account.id,
      action: 'payment.proof_uploaded',
      entityType: 'Booking',
      entityId: bookingId,
      detail: `Payment proof submitted (${file.type}, ${file.size} bytes)`,
    });

    const updatedBooking = await orm.Booking.where({ id: bookingId }).first();

    return NextResponse.json({
      success: true,
      message: 'Payment proof uploaded successfully',
      booking: {
        id: updatedBooking!.id,
        reference: updatedBooking!.reference,
        status: updatedBooking!.status,
        paymentStatus: updatedBooking!.paymentStatus,
      },
    });
  } catch (error) {
    logError(error, { route: '/api/bookings/upload-proof' });
    const formattedError = formatErrorResponse(error);
    return NextResponse.json(
      { error: formattedError.error, details: formattedError.details },
      { status: formattedError.statusCode }
    );
  }
}
