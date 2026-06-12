import { ImgHTMLAttributes, useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface SmartImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  /** Render this image eagerly (e.g. above-the-fold / LCP). Defaults to lazy. */
  priority?: boolean;
  /** Fallback content rendered when the image fails to load. */
  fallback?: React.ReactNode;
  /** Wrapper className applied to the outer <div>. */
  wrapperClassName?: string;
}

/**
 * Drop-in replacement for `<img>` that adds:
 *  - lazy loading + async decoding by default
 *  - graceful fallback on error
 *  - `fetchpriority` for above-the-fold images
 *
 * Use `priority` for hero/LCP images, leave default for everything else.
 */
export function SmartImage({
  priority,
  fallback,
  wrapperClassName,
  className,
  alt,
  onError,
  ...rest
}: SmartImageProps) {
  const [failed, setFailed] = useState(false);

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
      alt={alt}
      className={className}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      // `fetchpriority` is not in older lib.dom typings; cast to keep TS happy.
      {...({ fetchpriority: priority ? "high" : "auto" } as Record<string, string>)}
      onError={(e) => {
        setFailed(true);
        onError?.(e);
      }}
    />
  );
}

export default SmartImage;
