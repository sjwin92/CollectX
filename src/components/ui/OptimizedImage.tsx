import React, { useState, useEffect, useRef } from 'react';
import { createPlaceholderImage } from '@/utils/placeholderImage';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  fallbackSrc?: string;
  lazy?: boolean;
  retryCount?: number;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  fallbackSrc = createPlaceholderImage(),
  lazy = true,
  retryCount = 0,
  className,
  alt,
  ...props
}) => {
  const [currentSrc, setCurrentSrc] = useState<string>(src);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isInView, setIsInView] = useState(!lazy);
  const [hasRetried, setHasRetried] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || isInView) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsInView(true);
          observerRef.current?.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    if (imgRef.current) {
      observerRef.current.observe(imgRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [lazy, isInView]);

  // Direct image loading - let browser handle validation
  useEffect(() => {
    if (!isInView) return;

    setIsLoading(true);
    setIsError(false);
    setCurrentSrc(src);
  }, [src, isInView]);

  const handleLoad = () => {
    setIsLoading(false);
    setIsError(false);
  };

  const handleError = () => {
    console.warn(`Failed to load image: ${currentSrc}`);
    setIsLoading(false);
    
    if (!hasRetried && currentSrc !== fallbackSrc) {
      setHasRetried(true);
      setCurrentSrc(fallbackSrc);
      setIsLoading(true);
    } else {
      setIsError(true);
    }
  };

  return (
    <div className="relative">
      {/* Loading placeholder */}
      {isLoading && (
        <div className={cn(
          "absolute inset-0 bg-muted animate-pulse rounded",
          className
        )} />
      )}
      
      {/* Optimized image */}
      <img
        ref={imgRef}
        src={isInView ? currentSrc : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InRyYW5zcGFyZW50Ii8+PC9zdmc+'}
        alt={alt}
        className={cn(
          "transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100",
          className
        )}
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
      
      {/* Error indicator */}
      {isError && (
        <div className="absolute top-1 left-1 bg-red-500 text-white text-xs px-1 py-0.5 rounded">
          ⚠️
        </div>
      )}
    </div>
  );
};

export default OptimizedImage;