"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { decodeQRCodeFromVideo, decodeQRCodeFromFile } from "@/lib/qr-decoder";

interface QRScannerProps {
  tripId: string;
  paused?: boolean;
  onScanSuccess: (qrData: string) => void;
}

type CameraState =
  | "idle"
  | "requesting"
  | "active"
  | "denied"
  | "not_found"
  | "busy"
  | "insecure"
  | "unsupported"
  | "error";

export function QRScanner({ onScanSuccess, paused = false }: QRScannerProps) {
  // Determine initial secure context and media support synchronously
  const [cameraState, setCameraState] = useState<CameraState>(() => {
    if (typeof window !== "undefined") {
      if (!window.isSecureContext && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
        return "insecure";
      }
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return "unsupported";
      }
    }
    return "idle";
  });

  const [errorMessage, setErrorMessage] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      if (!window.isSecureContext && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
        return "Camera requires a secure HTTPS connection. Access the application over HTTPS or localhost to enable camera hardware.";
      }
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return "Live QR scanning is not supported by this browser. Use manual ticket lookup or open in Chrome/Safari.";
      }
    }
    return null;
  });

  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [manualCode, setManualCode] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanNotice, setScanNotice] = useState<string | null>(null);
  const cameraIsActive = cameraState === "active" && !paused;

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const permissionTimeoutRef = useRef<number | null>(null);
  const cameraAttemptRef = useRef(0);
  const processingRef = useRef(false);
  const decodingRef = useRef(false);

  // Stop camera tracks safely
  const stopCameraStream = useCallback(() => {
    if (scanIntervalRef.current) {
      window.clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (permissionTimeoutRef.current) {
      window.clearTimeout(permissionTimeoutRef.current);
      permissionTimeoutRef.current = null;
    }
    cameraAttemptRef.current += 1;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Enumerate cameras on mount and cleanup on unmount
  useEffect(() => {
    if (typeof window !== "undefined" && navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          const videoInputs = devices.filter((d) => d.kind === "videoinput");
          setAvailableCameras(videoInputs);
        })
        .catch(() => {});
    }

    return () => {
      stopCameraStream();
    };
  }, [stopCameraStream]);

  useEffect(() => {
    if (paused) {
      stopCameraStream();
    }
  }, [paused, stopCameraStream]);

  // Handle scanned token
  const handleDetectedCode = useCallback(
    async (code: string) => {
      if (processingRef.current) return;
      processingRef.current = true;
      setIsProcessing(true);
      setScanNotice("Ticket QR code detected. Verifying departure roster...");
      try {
        await onScanSuccess(code);
      } finally {
        processingRef.current = false;
        setIsProcessing(false);
        setScanNotice(null);
      }
    },
    [onScanSuccess]
  );

  // Start live camera stream with given mode
  const startCamera = useCallback(
    async (mode = facingMode) => {
      stopCameraStream();
      setCameraState("requesting");
      setErrorMessage(null);
      const attempt = cameraAttemptRef.current;

      if (typeof window !== "undefined" && !window.isSecureContext && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
        setCameraState("insecure");
        setErrorMessage("Camera requires a secure HTTPS connection.");
        return;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraState("unsupported");
        setErrorMessage("Live camera is not supported by this browser.");
        return;
      }

      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      try {
        let stream: MediaStream;
        try {
          const request = navigator.mediaDevices.getUserMedia(constraints);
          void request.then((lateStream) => {
            if (attempt !== cameraAttemptRef.current) {
              lateStream.getTracks().forEach((track) => track.stop());
            }
          }).catch(() => {});
          stream = await Promise.race([
            request,
            new Promise<never>((_, reject) => {
              permissionTimeoutRef.current = window.setTimeout(() => {
                cameraAttemptRef.current += 1;
                reject(new DOMException("Camera permission request timed out", "TimeoutError"));
              }, 15000);
            }),
          ]);
        } catch (firstErr: unknown) {
          if (firstErr instanceof DOMException && firstErr.name === "OverconstrainedError") {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          } else {
            throw firstErr;
          }
        }

        if (permissionTimeoutRef.current) {
          window.clearTimeout(permissionTimeoutRef.current);
          permissionTimeoutRef.current = null;
        }
        if (attempt !== cameraAttemptRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", "true");
          videoRef.current.muted = true;
          try {
            await videoRef.current.play();
          } catch {
            // Autoplay policy or play error
          }
        }

        setCameraState("active");

        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoInputs = devices.filter((d) => d.kind === "videoinput");
          setAvailableCameras(videoInputs);
        } catch {
          // ignore
        }

        if (scanIntervalRef.current) {
          window.clearInterval(scanIntervalRef.current);
        }

        scanIntervalRef.current = window.setInterval(async () => {
          if (!videoRef.current || !canvasRef.current || processingRef.current || decodingRef.current) return;
          decodingRef.current = true;
          try {
            const decoded = await decodeQRCodeFromVideo(videoRef.current, canvasRef.current);
            if (decoded) await handleDetectedCode(decoded);
          } finally {
            decodingRef.current = false;
          }
        }, 250);
      } catch (err: unknown) {
        stopCameraStream();
        if (err instanceof DOMException) {
          if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
            setCameraState("denied");
            setErrorMessage(
              "Camera access was denied. Allow camera permission in your browser settings and try again."
            );
          } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
            setCameraState("not_found");
            setErrorMessage("No compatible camera was detected on this device.");
          } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
            setCameraState("busy");
            setErrorMessage(
              "The camera may already be in use by another application or browser tab."
            );
          } else if (err.name === "TimeoutError") {
            setCameraState("error");
            setErrorMessage("Camera permission did not respond. Check the browser permission prompt and try again.");
          } else {
            setCameraState("error");
            setErrorMessage("The camera could not be started. Check browser permissions and try again.");
          }
        } else {
          setCameraState("error");
          setErrorMessage("An unexpected error occurred while starting the camera.");
        }
      }
    },
    [facingMode, handleDetectedCode, stopCameraStream]
  );

  // Flip camera between front & rear
  const handleFlipCamera = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    if (cameraState === "active") {
      startCamera(nextMode);
    }
  };

  // Handle manual code entry
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleDetectedCode(manualCode.trim());
      setManualCode("");
    }
  };

  // Handle uploaded image file
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanNotice("Decoding QR code from uploaded image...");
    try {
      const code = await decodeQRCodeFromFile(file);
      if (code) {
        handleDetectedCode(code);
      } else {
        setScanNotice("No valid QR code detected in photo. Please enter code manually below.");
        setShowManualInput(true);
      }
    } catch {
      setScanNotice("Failed to read image. Please enter code manually below.");
      setShowManualInput(true);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-4">
      {/* Hidden processing canvas for fallback QR decode */}
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E3E8E5]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0A0A0A]">
            Scan Boarding Pass
          </h1>
          <p className="text-xs text-[#66706A] mt-0.5">
            Scan a ticket to review the passenger
          </p>
          <p className="mt-2 text-[10px] font-semibold tracking-wide text-[#92400E]">
            REAL HTTPS DEVICE VERIFICATION REQUIRED
          </p>
          <p className="text-[10px] text-[#71859A]">
            Test live camera scanning on a physical device over HTTPS before deployment.
          </p>
        </div>
        <Button variant="neutral" size="sm" asChild>
          <Link href="/staff" className="inline-flex items-center gap-1 text-xs">
            <span>←</span>
            <span>Departures</span>
          </Link>
        </Button>
      </div>

      {/* Camera Viewfinder Viewport */}
      <div className="relative aspect-[4/3] bg-[#0A0A0A] rounded-2xl overflow-hidden flex flex-col items-center justify-center border-2 border-[#171717] shadow-md">
        {/* Real Live Video Feed */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover ${
            cameraIsActive ? "block" : "hidden"
          }`}
        />

        {/* Viewfinder Target Frame Overlay (shown when camera is active) */}
        {cameraIsActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-6">
            <div className="w-52 h-52 sm:w-56 sm:h-56 border border-white/20 rounded-2xl relative flex items-center justify-center bg-black/10 backdrop-blur-[0.5px]">
              {/* Green Corner Marks */}
              <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-brand-green rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-brand-green rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-brand-green rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-brand-green rounded-br-lg" />
              <div className="w-full h-0.5 bg-brand-green opacity-80 animate-pulse shadow-[0_0_10px_var(--brand-haramaya-green)]" />
            </div>
            <span className="text-[11px] font-semibold text-white/90 drop-shadow mt-3 uppercase tracking-wider">
              {isProcessing ? "Verifying ticket..." : "Align QR within frame"}
            </span>
          </div>
        )}

        {/* Camera Top Controls Bar */}
        {cameraIsActive && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20">
            {availableCameras.length > 1 && (
              <button
                type="button"
                onClick={handleFlipCamera}
                title="Switch Camera (Front / Rear)"
                className="px-2.5 py-1 rounded-md bg-black/70 hover:bg-black/90 text-white text-[11px] font-medium border border-white/20 backdrop-blur-xs flex items-center gap-1 transition cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>{facingMode === "environment" ? "Rear" : "Front"}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                stopCameraStream();
                setCameraState("idle");
              }}
              title="Stop Camera Feed"
              className="px-2.5 py-1 rounded-md bg-black/70 hover:bg-black/90 text-zinc-300 hover:text-white text-[11px] font-medium border border-white/20 backdrop-blur-xs transition cursor-pointer"
            >
              Stop
            </button>
          </div>
        )}

        {/* State Overlays when Camera is not Active */}
        {!cameraIsActive && (
          <div className="text-center p-6 text-zinc-300 space-y-3 z-10 max-w-sm">
            {paused ? (
              <div className="space-y-2">
                <div className="text-sm font-bold text-white">Camera paused</div>
                <p className="text-[11px] text-zinc-400">
                  Verify the passenger&apos;s physical identity and complete check-in before scanning another ticket.
                </p>
              </div>
            ) : cameraState === "requesting" ? (
              <div className="space-y-2">
                <div className="w-8 h-8 mx-auto border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
                <div className="text-xs font-semibold text-white">Starting camera feed...</div>
                <p className="text-[11px] text-zinc-400">Please grant camera permissions when prompted by your browser.</p>
              </div>
            ) : cameraState === "insecure" ? (
              <div className="space-y-2">
                <div className="w-10 h-10 mx-auto rounded-full bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center font-bold">
                  !
                </div>
                <div className="text-sm font-bold text-white">Secure Context Required</div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  {errorMessage}
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowManualInput(true)}
                    className="text-xs text-brand-green font-semibold underline hover:text-[#066044]"
                  >
                    Enter ticket code manually →
                  </button>
                </div>
              </div>
            ) : cameraState === "denied" || cameraState === "not_found" || cameraState === "busy" || cameraState === "error" || cameraState === "unsupported" ? (
              <div className="space-y-2.5">
                <div className="w-10 h-10 mx-auto rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center font-bold">
                  ✕
                </div>
                <div className="text-sm font-bold text-white">
                  {cameraState === "denied"
                    ? "Camera Access Denied"
                    : cameraState === "not_found"
                    ? "No Camera Detected"
                    : cameraState === "busy"
                    ? "Camera In Use"
                    : "Camera Unavailable"}
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  {errorMessage || "Camera could not be started."}
                </p>
                <div className="pt-2 flex items-center justify-center gap-2">
                  <Button size="sm" onClick={() => startCamera()} className="text-xs font-semibold">
                    Try Again
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowManualInput(true)}
                    className="text-xs"
                  >
                    Manual Lookup
                  </Button>
                </div>
              </div>
            ) : (
              /* Idle Standby State with explicit Start Camera button */
              <div className="space-y-3">
                <svg
                  className="w-10 h-10 mx-auto text-zinc-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <div>
                  <div className="text-xs font-bold text-white uppercase tracking-wider">
                    Departure Gate Camera
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Align traveler boarding pass QR with live camera
                  </p>
                </div>
                <Button
                  onClick={() => startCamera()}
                  size="default"
                  className="font-bold text-xs shadow-md bg-brand-green hover:bg-[#066044] text-white"
                >
                  Start Camera Feed
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Operational Notice */}
      {scanNotice && (
        <div className="text-xs p-2.5 rounded-lg border border-[#A7F3D0] bg-[#ECFDF5] text-[#066044] font-medium text-center shadow-xs">
          {scanNotice}
        </div>
      )}

      {/* Secondary & Fallback Options */}
      <div className="space-y-3 pt-1">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            type="button"
            variant="neutral"
            size="sm"
            onClick={() => setShowManualInput(!showManualInput)}
          >
            {showManualInput ? "Hide manual entry" : "Enter code manually"}
          </Button>
          <Button
            type="button"
            variant="neutral"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            Upload QR photo
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
          <Button variant="secondary" size="sm" asChild>
            <Link href="/staff/search">Search passenger</Link>
          </Button>
        </div>

        {/* Manual Code Input Form */}
        {showManualInput && (
          <form
            onSubmit={handleManualSubmit}
            className="bg-white border border-[#E3E8E5] rounded-xl p-4 space-y-3 shadow-xs"
          >
            <div>
              <label
                htmlFor="ticket-code-input"
                className="block text-xs font-semibold text-[#171717] uppercase tracking-wide mb-1"
              >
                Ticket Reference or Public Code
              </label>
              <input
                id="ticket-code-input"
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="e.g. HUT-82KF, TKT-..., or HUT82KF"
                className="w-full h-10 px-3 border border-[#E3E8E5] rounded-lg text-sm font-mono focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/15 uppercase"
                autoFocus
              />
            </div>
            <Button
              type="submit"
              disabled={!manualCode.trim() || isProcessing}
              fullWidth
              size="default"
              className="font-bold shadow-xs"
            >
              {isProcessing ? "Verifying..." : "Verify Code"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
