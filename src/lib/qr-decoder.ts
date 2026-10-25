"use client";

import jsQR from "jsqr";

interface BarcodeResult {
  rawValue: string;
}

interface BarcodeDetectorInstance {
  detect: (source: ImageBitmapSource) => Promise<BarcodeResult[]>;
}

declare global {
  interface Window {
    BarcodeDetector?: {
      new (options?: { formats: string[] }): BarcodeDetectorInstance;
      getSupportedFormats?: () => Promise<string[]>;
    };
  }
}

let nativeDetectorInstance: BarcodeDetectorInstance | null = null;
let nativeDetectorChecked = false;

function getNativeDetector(): BarcodeDetectorInstance | null {
  if (nativeDetectorChecked) return nativeDetectorInstance;
  nativeDetectorChecked = true;
  try {
    if (typeof window !== "undefined" && window.BarcodeDetector) {
      nativeDetectorInstance = new window.BarcodeDetector({ formats: ["qr_code"] });
    }
  } catch {
    nativeDetectorInstance = null;
  }
  return nativeDetectorInstance;
}

/**
 * Universal QR code decoder:
 * 1. Primary: Native BarcodeDetector where supported (Chrome, Chromium, Edge, Android WebView).
 * 2. Fallback: Pure JavaScript jsQR via canvas ImageData (iOS Safari, Firefox, older browsers).
 */
export async function decodeQRCodeFromVideo(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement
): Promise<string | null> {
  if (!video || video.readyState < 2) return null;

  // 1. Try Native BarcodeDetector
  const native = getNativeDetector();
  if (native) {
    try {
      const barcodes = await native.detect(video);
      if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
        return barcodes[0].rawValue.trim();
      }
    } catch {
      // Fall through to jsQR fallback
    }
  }

  // 2. Fallback: jsQR via Canvas context
  try {
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    if (width === 0 || height === 0) return null;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });

    if (code && code.data) {
      return code.data.trim();
    }
  } catch {
    // Frame decode pass failed, will retry next frame
  }

  return null;
}

/**
 * Decodes QR from an uploaded file / image blob using both strategies.
 */
export async function decodeQRCodeFromFile(file: File): Promise<string | null> {
  // Strategy A: Native BarcodeDetector with ImageBitmap
  if (typeof window !== "undefined" && window.BarcodeDetector) {
    try {
      const bitmap = await createImageBitmap(file);
      const native = getNativeDetector();
      if (native) {
        const barcodes = await native.detect(bitmap);
        if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
          return barcodes[0].rawValue.trim();
        }
      }
    } catch {
      // fallback
    }
  }

  // Strategy B: jsQR via HTMLImageElement & Canvas
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        resolve(code && code.data ? code.data.trim() : null);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}
