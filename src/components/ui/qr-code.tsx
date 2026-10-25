'use client';

import { QRCodeSVG } from 'qrcode.react';

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
}

export function QRCode({ value, size = 200, className = '' }: QRCodeProps) {
  return (
    <QRCodeSVG
      value={value}
      width={size}
      height={size}
      level="M"
      marginSize={2}
      className={className}
      role="img"
      aria-label="Secure ticket QR code"
    />
  );
}
