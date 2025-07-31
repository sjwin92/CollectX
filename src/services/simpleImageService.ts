// Simple, reliable image service without AI complexity
import { createPlaceholderImage } from '@/utils/placeholderImage';
import { getAllPossibleCardImageUrls, getConsistentCardImageUrl } from '@/services/api/cardImageService';

interface ImageCacheItem {
  url: string;
  timestamp: number;
  isValid: boolean;
}

class SimpleImageService {
  private cache = new Map<string, ImageCacheItem>();
  private validationQueue = new Set<string>();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  private getCacheKey(url: string): string {
    return encodeURIComponent(url);
  }

  // Quick URL validation without complex processing
  private async validateImageUrl(url: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(url, { 
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok && response.headers.get('content-type')?.startsWith('image/');
    } catch {
      return false;
    }
  }

  // Get the first working image URL from a list
  async getValidImageUrl(urls: string[]): Promise<string> {
    for (const url of urls) {
      const cacheKey = this.getCacheKey(url);
      const cached = this.cache.get(cacheKey);
      
      // Use cached result if recent
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        if (cached.isValid) return url;
        continue;
      }

      // Skip if already being validated
      if (this.validationQueue.has(url)) continue;

      this.validationQueue.add(url);
      
      try {
        const isValid = await this.validateImageUrl(url);
        this.cache.set(cacheKey, {
          url,
          timestamp: Date.now(),
          isValid
        });

        if (isValid) {
          this.validationQueue.delete(url);
          return url;
        }
      } catch (error) {
        console.warn(`Image validation failed for ${url}:`, error);
        this.cache.set(cacheKey, {
          url,
          timestamp: Date.now(),
          isValid: false
        });
      } finally {
        this.validationQueue.delete(url);
      }
    }

    // Return placeholder if no valid images found
    return createPlaceholderImage();
  }

  // Get reliable card image URL with fallbacks
  async getCardImageUrl(cardId: string, directUrl?: string): Promise<string> {
    const potentialUrls: string[] = [];

    // Add direct URL if provided
    if (directUrl && !directUrl.includes('placeholder') && !directUrl.includes('cardback')) {
      potentialUrls.push(directUrl);
    }

    // Add consistent card URLs
    if (cardId) {
      potentialUrls.push(getConsistentCardImageUrl(cardId, 'large'));
      potentialUrls.push(getConsistentCardImageUrl(cardId, 'small'));
      
      // Add all possible URLs as fallbacks
      const allUrls = getAllPossibleCardImageUrls(cardId);
      potentialUrls.push(...allUrls);
    }

    // Remove duplicates
    const uniqueUrls = [...new Set(potentialUrls.filter(Boolean))];

    return this.getValidImageUrl(uniqueUrls);
  }

  // Simple image preloading for performance
  async preloadImages(cardIds: string[]): Promise<void> {
    const preloadPromises = cardIds.slice(0, 10).map(async (cardId) => {
      try {
        const imageUrl = await this.getCardImageUrl(cardId);
        if (!imageUrl.startsWith('data:')) {
          const img = new Image();
          img.src = imageUrl;
        }
      } catch (error) {
        console.warn(`Preload failed for card ${cardId}:`, error);
      }
    });

    await Promise.allSettled(preloadPromises);
  }

  // Clear cache to free memory
  clearCache(): void {
    this.cache.clear();
  }

  // Get cache statistics
  getCacheStats(): { size: number; validUrls: number } {
    const validUrls = Array.from(this.cache.values()).filter(item => item.isValid).length;
    return {
      size: this.cache.size,
      validUrls
    };
  }
}

export const simpleImageService = new SimpleImageService();