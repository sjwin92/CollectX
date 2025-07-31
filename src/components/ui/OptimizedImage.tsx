import React, { useState, useEffect, useRef } from 'react';
import { imageOptimizer } from '@/services/ai/imageOptimization';
import { createPlaceholderImage } from '@/utils/placeholderImage';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  fallbackSrc?: string;
  useAI?: boolean;
  lazy?: boolean;
  showOptimizationBadge?: boolean;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  fallbackSrc = createPlaceholderImage(),
  useAI = false,
  lazy = true,
  showOptimizationBadge = false,
  className,
  alt,
  ...props
}) => {
  const [currentSrc, setCurrentSrc] = useState<string>(src);
  const [isOptimized, setIsOptimized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isInView, setIsInView] = useState(!lazy);
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

  // Image optimization effect
  useEffect(() => {
    if (!isInView) return;

    let isCancelled = false;
    setIsLoading(true);
    setIsError(false);

    const optimizeAndLoad = async () => {
      try {
        const optimizedSrc = await imageOptimizer.optimizeImage(src, useAI);
        
        if (!isCancelled) {
          setCurrentSrc(optimizedSrc);
          setIsOptimized(useAI);
        }
      } catch (error) {
        console.warn('Image optimization failed:', error);
        if (!isCancelled) {
          setCurrentSrc(src);
          setIsOptimized(false);
        }
      }
    };

    optimizeAndLoad();

    return () => {
      isCancelled = true;
    };
  }, [src, useAI, isInView]);

  const handleLoad = () => {
    setIsLoading(false);
    setIsError(false);
  };

  const handleError = () => {
    console.warn(`Failed to load image: ${currentSrc}`);
    setIsLoading(false);
    setIsError(true);
    if (currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      setIsOptimized(false);
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
      
      {/* Optimization badge */}
      {showOptimizationBadge && isOptimized && !isLoading && (
        <div className="absolute top-1 right-1 bg-green-500 text-white text-xs px-1 py-0.5 rounded">
          AI ✨
        </div>
      )}
      
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