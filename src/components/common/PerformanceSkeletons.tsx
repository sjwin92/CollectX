// Enhanced loading skeleton with better performance
import React from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface SkeletonCardProps {
  className?: string;
  showDetails?: boolean;
  aspectRatio?: 'card' | 'square';
  priority?: 'high' | 'medium' | 'low';
}

const SkeletonCard: React.FC<SkeletonCardProps> = ({ 
  className, 
  showDetails = true, 
  aspectRatio = 'card',
  priority = 'medium'
}) => {
  const aspectClass = aspectRatio === 'card' ? 'aspect-[2/3]' : 'aspect-square';
  
  // Reduce animation frequency for low priority cards to save CPU
  const animationClass = priority === 'low' ? '' : 'animate-pulse';

  return (
    <div className={cn("space-y-3", className)}>
      {/* Image skeleton */}
      <Skeleton 
        className={cn(
          "w-full rounded-md bg-gradient-to-br from-muted to-muted/50",
          aspectClass,
          animationClass
        )} 
      />
      
      {showDetails && (
        <>
          {/* Title skeleton */}
          <div className="space-y-2">
            <Skeleton className={cn("h-4 w-3/4 mx-auto", animationClass)} />
            <Skeleton className={cn("h-3 w-1/2 mx-auto", animationClass)} />
          </div>
          
          {/* Price skeleton */}
          <Skeleton className={cn("h-4 w-16 mx-auto", animationClass)} />
          
          {/* Additional details */}
          <div className="flex justify-center gap-1">
            <Skeleton className={cn("h-3 w-12 rounded-full", animationClass)} />
            <Skeleton className={cn("h-3 w-8 rounded-full", animationClass)} />
          </div>
        </>
      )}
    </div>
  );
};

interface CardGridSkeletonProps {
  count?: number;
  className?: string;
  priority?: 'high' | 'medium' | 'low';
}

export const CardGridSkeleton: React.FC<CardGridSkeletonProps> = ({ 
  count = 12, 
  className,
  priority = 'medium'
}) => {
  return (
    <div className={cn(
      "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4",
      className
    )}>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard 
          key={i} 
          priority={i < 6 ? 'high' : priority} // First 6 are high priority
        />
      ))}
    </div>
  );
};

export default SkeletonCard;