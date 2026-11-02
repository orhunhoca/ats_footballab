import Image from "next/image";
import { cn } from "@/lib/utils";

export const BRAND_NAME = "FootballLab";

interface BrandProps {
  className?: string;
  /** Logo yüksekliği (px) */
  size?: number;
  showName?: boolean;
  nameClassName?: string;
}

/** Logo + marka adı. Logo koyu zeminli olduğundan yuvarlatılmış bir kutuda gösterilir. */
export function Brand({ className, size = 40, showName = true, nameClassName }: BrandProps) {
  return (
    <span className={cn("inline-flex items-center gap-2 min-w-0", className)}>
      <span
        className="relative shrink-0 overflow-hidden rounded-lg bg-black"
        style={{ height: size, width: Math.round(size * 1.94) }}
      >
        <Image
          src="/logo.png"
          alt={`${BRAND_NAME} logosu`}
          fill
          sizes={`${Math.round(size * 1.94)}px`}
          className="object-contain"
          priority
        />
      </span>
      {showName && (
        <span
          className={cn(
            "font-bold text-xl truncate bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent",
            nameClassName
          )}
        >
          {BRAND_NAME}
        </span>
      )}
    </span>
  );
}
