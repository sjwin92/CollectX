import { ImgHTMLAttributes, useEffect, useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface SmartImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  /** Render this image eagerly (e.g. above-the-fold / LCP). Defaults to lazy. */
  priority?: boolean;
  /** Fallback content rendered when the image (and fallbackSrc, if any) fails. */
  fallback?: React.ReactNode;
  /** Wrapper className applied to the outer <div>. */
  wrapperClassName?: string;
  /** Try this URL when the primary `src` fails before giving up. */
  fallbackSrc?: string;
}

/**
 * Drop-in replacement for `<img>` that adds:
 *  - lazy loading + async decoding by default
 *  - optional fallbackSrc swap on first error (e.g. scrydex → pokemontcg)
 *  - graceful UI fallback when both URLs fail
 *  - `fetchpriority` for above-the-fold images
 */
export function SmartImage({
  priority,
  fallback,
  wrapperClassName,
  className,
  alt,
  src,
  fallbackSrc,
  onError,
  ...rest
}: SmartImageProps) {
  const [currentSrc, setCurrentSrc] = useState<string | undefined>(src as string | undefined);
  const [triedFallback, setTriedFallback] = useState(false);
  const [failed, setFailed] = useState(false);

  // Reset state if the parent passes a new src.
  useEffect(() => {
    setCurrentSrc(src as string | undefined);
    setTriedFallback(false);
    setFailed(false);
  }, [src]);

  if (failed) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground",
          wrapperClassName,
          className,
        )}
        role="img"
        aria-label={alt}
      >
        {fallback ?? <ImageOff className="h-6 w-6 opacity-50" />}
      </div>
    );
  }

  return (
    <img
      {...rest}
      src={currentSrc}
      alt={alt}
      className={className}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      // `fetchpriority` is not in older lib.dom typings; cast to keep TS happy.
      {...({ fetchpriority: priority ? "high" : "auto" } as Record<string, string>)}
      onError={(e) => {
        if (!triedFallback && fallbackSrc && fallbackSrc !== currentSrc) {
          setTriedFallback(true);
          setCurrentSrc(fallbackSrc);
          return;
        }
        setFailed(true);
        onError?.(e);
      }}
    />
  );
}

export default SmartImage;
