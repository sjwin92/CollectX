// Performance monitoring hook for image loading
import { useState, useEffect, useCallback } from 'react';
import { enhancedImageService } from '@/services/enhancedImageService';

interface PerformanceMetrics {
  totalImages: number;
  loadedImages: number;
  failedImages: number;
  avgLoadTime: number;
  cacheHitRate: number;
  networkType: string;
}

export const useImagePerformance = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    totalImages: 0,
    loadedImages: 0,
    failedImages: 0,
    avgLoadTime: 0,
    cacheHitRate: 0,
    networkType: '4g'
  });

  const [isOptimizing, setIsOptimizing] = useState(false);

  const updateMetrics = useCallback(() => {
    const stats = enhancedImageService.getCacheStats();
    setMetrics(prev => ({
      ...prev,
      avgLoadTime: stats.avgLoadTime,
      networkType: stats.networkType,
      cacheHitRate: stats.size > 0 ? (stats.validUrls / stats.size) * 100 : 0
    }));
  }, []);

  const trackImageLoad = useCallback((success: boolean, loadTime: number) => {
    setMetrics(prev => ({
      ...prev,
      totalImages: prev.totalImages + 1,
      loadedImages: success ? prev.loadedImages + 1 : prev.loadedImages,
      failedImages: success ? prev.failedImages : prev.failedImages + 1,
      avgLoadTime: (prev.avgLoadTime + loadTime) / 2
    }));
  }, []);

  const optimizePerformance = useCallback(async () => {
    setIsOptimizing(true);
    try {
      // Clear old cache entries
      enhancedImageService.clearCache();
      
      // Start background cache cleanup
      enhancedImageService.startCacheCleanup();
      
      console.log('Image performance optimized');
    } finally {
      setIsOptimizing(false);
    }
  }, []);

  useEffect(() => {
    updateMetrics();
    const interval = setInterval(updateMetrics, 10000); // Update every 10s
    return () => clearInterval(interval);
  }, [updateMetrics]);

  return {
    metrics,
    isOptimizing,
    trackImageLoad,
    optimizePerformance,
    updateMetrics
  };
};