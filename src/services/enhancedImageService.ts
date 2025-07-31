// Enhanced image service with performance optimizations
import { createPlaceholderImage } from '@/utils/placeholderImage';
import { getAllPossibleCardImageUrls, getConsistentCardImageUrl } from '@/services/api/cardImageService';

interface ImageCacheItem {
  url: string;
  timestamp: number;
  isValid: boolean;
  priority: 'high' | 'medium' | 'low';
  loadTime?: number;
}

interface NetworkInfo {
  effectiveType: string;
  downlink: number;
}

// Performance-optimized image service
class EnhancedImageService {
  private cache = new Map<string, ImageCacheItem>();
  private validationQueue = new Set<string>();
  private preloadQueue: string[] = [];
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
  private readonly MAX_CACHE_SIZE = 200;
  private readonly MAX_CONCURRENT_LOADS = 4;
  private currentLoads = 0;

  // Network-aware settings
  private getNetworkInfo(): NetworkInfo {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    return {
      effectiveType: connection?.effectiveType || '4g',
      downlink: connection?.downlink || 10
    };
  }

  // Smart image quality selection based on network
  private getOptimalImageSize(cardId: string): 'small' | 'large' {
    const networkInfo = this.getNetworkInfo();
    
    // Use small images for slower connections
    if (networkInfo.effectiveType === 'slow-2g' || networkInfo.effectiveType === '2g') {
      return 'small';
    }
    
    // Use large images for fast connections
    if (networkInfo.downlink > 5) {
      return 'large';
    }
    
    return 'small'; // Default to small for better performance
  }

  private getCacheKey(url: string): string {
    return encodeURIComponent(url);
  }

  // Smart cache management with LRU eviction
  private manageCacheSize(): void {
    if (this.cache.size <= this.MAX_CACHE_SIZE) return;

    // Sort by priority and timestamp (LRU for same priority)
    const entries = Array.from(this.cache.entries());
    entries.sort(([, a], [, b]) => {
      const priorityOrder = { low: 0, medium: 1, high: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return a.timestamp - b.timestamp;
    });

    // Remove oldest, lowest priority entries
    const toRemove = entries.slice(0, this.cache.size - this.MAX_CACHE_SIZE + 20);
    toRemove.forEach(([key]) => this.cache.delete(key));
  }

  // Enhanced URL validation with performance tracking
  private async validateImageUrl(url: string, priority: 'high' | 'medium' | 'low' = 'medium'): Promise<boolean> {
    try {
      const startTime = performance.now();
      const controller = new AbortController();
      const timeout = priority === 'high' ? 3000 : 5000;
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, { 
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const loadTime = performance.now() - startTime;
      
      const isValid = response.ok && response.headers.get('content-type')?.startsWith('image/');
      
      // Cache with performance metrics
      const cacheKey = this.getCacheKey(url);
      this.cache.set(cacheKey, {
        url,
        timestamp: Date.now(),
        isValid,
        priority,
        loadTime
      });

      this.manageCacheSize();
      return isValid;
    } catch {
      return false;
    }
  }

  // Intelligent image URL resolution with priority
  async getValidImageUrl(urls: string[], priority: 'high' | 'medium' | 'low' = 'medium'): Promise<string> {
    for (const url of urls) {
      const cacheKey = this.getCacheKey(url);
      const cached = this.cache.get(cacheKey);
      
      // Use cached result if recent
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        if (cached.isValid) {
          // Update timestamp for LRU
          cached.timestamp = Date.now();
          cached.priority = priority;
          return url;
        }
        continue;
      }

      // Skip if already being validated
      if (this.validationQueue.has(url)) continue;

      // Respect concurrent load limits for non-high priority
      if (priority !== 'high' && this.currentLoads >= this.MAX_CONCURRENT_LOADS) {
        continue;
      }

      this.validationQueue.add(url);
      this.currentLoads++;
      
      try {
        const isValid = await this.validateImageUrl(url, priority);
        if (isValid) {
          return url;
        }
      } catch (error) {
        console.warn(`Image validation failed for ${url}:`, error);
      } finally {
        this.validationQueue.delete(url);
        this.currentLoads--;
      }
    }

    return createPlaceholderImage();
  }

  // Smart card image URL generation with network awareness
  async getCardImageUrl(cardId: string, directUrl?: string, priority: 'high' | 'medium' | 'low' = 'medium'): Promise<string> {
    const potentialUrls: string[] = [];
    const optimalSize = this.getOptimalImageSize(cardId);

    // Add direct URL if provided and seems reliable
    if (directUrl && !directUrl.includes('placeholder') && !directUrl.includes('cardback')) {
      potentialUrls.push(directUrl);
    }

    // Add network-optimized URLs first
    if (cardId) {
      potentialUrls.push(getConsistentCardImageUrl(cardId, optimalSize));
      
      // Add alternative size as backup
      const alternativeSize = optimalSize === 'large' ? 'small' : 'large';
      potentialUrls.push(getConsistentCardImageUrl(cardId, alternativeSize));
      
      // Add all possible URLs as fallbacks
      const allUrls = getAllPossibleCardImageUrls(cardId);
      potentialUrls.push(...allUrls);
    }

    // Remove duplicates and prioritize by network conditions
    const uniqueUrls = [...new Set(potentialUrls.filter(Boolean))];

    return this.getValidImageUrl(uniqueUrls, priority);
  }

  // Intelligent preloading with intersection observer
  async preloadImages(cardIds: string[], priority: 'high' | 'medium' | 'low' = 'low'): Promise<void> {
    // Limit preloading based on network conditions
    const networkInfo = this.getNetworkInfo();
    const maxPreload = networkInfo.effectiveType === '4g' ? 15 : 8;
    
    const preloadPromises = cardIds.slice(0, maxPreload).map(async (cardId, index) => {
      try {
        // Stagger preloading to avoid overwhelming the network
        if (index > 0) {
          await new Promise(resolve => setTimeout(resolve, index * 100));
        }

        const imageUrl = await this.getCardImageUrl(cardId, undefined, priority);
        if (!imageUrl.startsWith('data:')) {
          return this.preloadImage(imageUrl);
        }
      } catch (error) {
        console.warn(`Preload failed for card ${cardId}:`, error);
      }
    });

    await Promise.allSettled(preloadPromises);
  }

  // Native image preloading with promise support
  private preloadImage(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Failed to preload ${url}`));
      img.src = url;
    });
  }

  // Progressive image loading for visible items
  async loadVisibleImages(cardIds: string[]): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    
    // Load high-priority images first (first 6 visible cards)
    const highPriorityIds = cardIds.slice(0, 6);
    const mediumPriorityIds = cardIds.slice(6, 12);
    const lowPriorityIds = cardIds.slice(12);

    // Load in priority order
    for (const cardId of highPriorityIds) {
      const imageUrl = await this.getCardImageUrl(cardId, undefined, 'high');
      results.set(cardId, imageUrl);
    }

    // Load medium priority in parallel
    const mediumPromises = mediumPriorityIds.map(async (cardId) => {
      const imageUrl = await this.getCardImageUrl(cardId, undefined, 'medium');
      results.set(cardId, imageUrl);
    });

    await Promise.allSettled(mediumPromises);

    // Load low priority in background
    setTimeout(async () => {
      const lowPromises = lowPriorityIds.map(async (cardId) => {
        const imageUrl = await this.getCardImageUrl(cardId, undefined, 'low');
        results.set(cardId, imageUrl);
      });
      await Promise.allSettled(lowPromises);
    }, 1000);

    return results;
  }

  // Cache management and cleanup
  clearCache(): void {
    this.cache.clear();
  }

  // Performance analytics
  getCacheStats(): { 
    size: number; 
    validUrls: number; 
    avgLoadTime: number;
    networkType: string;
  } {
    const validEntries = Array.from(this.cache.values()).filter(item => item.isValid);
    const avgLoadTime = validEntries.reduce((sum, item) => sum + (item.loadTime || 0), 0) / validEntries.length || 0;
    
    return {
      size: this.cache.size,
      validUrls: validEntries.length,
      avgLoadTime: Math.round(avgLoadTime),
      networkType: this.getNetworkInfo().effectiveType
    };
  }

  // Clear old cache entries periodically
  startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      const expiredEntries = Array.from(this.cache.entries())
        .filter(([, item]) => now - item.timestamp > this.CACHE_DURATION);
      
      expiredEntries.forEach(([key]) => this.cache.delete(key));
      
      if (expiredEntries.length > 0) {
        console.log(`Cleaned up ${expiredEntries.length} expired cache entries`);
      }
    }, 5 * 60 * 1000); // Clean every 5 minutes
  }
}

export const enhancedImageService = new EnhancedImageService();