import Image from "next/image";

interface BrandEmblemProps {
  size?: number;
  className?: string;
}

/** Seal detail cropped from the approved Haramaya Trip logo. */
export function BrandEmblem({ size = 36, className = "" }: BrandEmblemProps) {
  return (
    <Image
      src="/brand/haramaya-trip-seal.png"
      alt=""
      aria-hidden="true"
      width={112}
      height={112}
      className={`shrink-0 rounded-full object-cover ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

interface BrandLogoProps {
  className?: string;
  size?: number;
  subtitle?: string;
}

/** Compact seal and wordmark crop for navigation and tight spaces. */
export function BrandLogo({
  className = "",
  size = 36,
  subtitle,
}: BrandLogoProps) {
  return (
    <span className={`inline-flex flex-col items-start ${className}`}>
      <Image
        src="/brand/haramaya-trip-compact.png"
        alt="Haramaya Trip"
        width={436}
        height={112}
        className="max-w-full object-contain object-left"
        style={{ width: "auto", height: size }}
      />
      {subtitle ? (
        <span className="mt-0.5 pl-1 text-[10px] font-medium leading-none tracking-wide text-[#647A91]">
          {subtitle}
        </span>
      ) : null}
    </span>
  );
}

/** Full approved seal, wordmark, and coach lockup for prominent brand placements. */
export function FullBrandLogo({ className = "" }: { className?: string }) {
  return (
    <Image
      src="/brand/haramaya-trip-logo.png"
      alt="Haramaya Trip"
      width={472}
      height={256}
      className={className}
    />
  );
}
