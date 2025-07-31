import { pipeline, env } from '@huggingface/transformers';

// Configure transformers.js for optimal performance
env.allowLocalModels = false;
env.useBrowserCache = true;

const MAX_IMAGE_DIMENSION = 512;
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

interface CachedImage {
  blob: Blob;
  timestamp: number;
  optimized: boolean;
}

class ImageOptimizationService {
  private cache = new Map<string, CachedImage>();
  private segmenter: any = null;
  private processingQueue = new Set<string>();

  async initializeModel() {
    if (!this.segmenter) {
      try {
        console.log('Initializing AI image optimization model...');
        this.segmenter = await pipeline('image-segmentation', 'Xenova/segformer-b0-finetuned-ade-512-512', {
          device: 'webgpu',
        });
        console.log('AI model initialized successfully');
      } catch (error) {
        console.warn('Failed to initialize AI model, falling back to basic optimization:', error);
      }
    }
  }

  private getCacheKey(url: string): string {
    return btoa(url).replace(/[^a-zA-Z0-9]/g, '');
  }

  private async resizeImage(imageElement: HTMLImageElement, maxDimension: number = MAX_IMAGE_DIMENSION): Promise<Blob> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) throw new Error('Could not get canvas context');
    
    let { naturalWidth: width, naturalHeight: height } = imageElement;
    
    // Calculate new dimensions
    if (width > maxDimension || height > maxDimension) {
      if (width > height) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
    }
    
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(imageElement, 0, 0, width, height);
    
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('Failed to create blob')),
        'image/jpeg',
        0.8
      );
    });
  }

  private async enhanceImage(imageElement: HTMLImageElement): Promise<Blob> {
    try {
      if (!this.segmenter) {
        return this.resizeImage(imageElement);
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) throw new Error('Could not get canvas context');
      
      // Resize for processing
      let { naturalWidth: width, naturalHeight: height } = imageElement;
      if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        if (width > height) {
          height = Math.round((height * MAX_IMAGE_DIMENSION) / width);
          width = MAX_IMAGE_DIMENSION;
        } else {
          width = Math.round((width * MAX_IMAGE_DIMENSION) / height);
          height = MAX_IMAGE_DIMENSION;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(imageElement, 0, 0, width, height);
      
      // Apply AI enhancement (background removal for card images)
      const imageData = canvas.toDataURL('image/jpeg', 0.9);
      const result = await this.segmenter(imageData);
      
      if (result && Array.isArray(result) && result[0]?.mask) {
        const outputCanvas = document.createElement('canvas');
        outputCanvas.width = width;
        outputCanvas.height = height;
        const outputCtx = outputCanvas.getContext('2d');
        
        if (outputCtx) {
          outputCtx.drawImage(canvas, 0, 0);
          
          const outputImageData = outputCtx.getImageData(0, 0, width, height);
          const data = outputImageData.data;
          
          // Enhance card visibility by improving background contrast
          for (let i = 0; i < result[0].mask.data.length; i++) {
            const maskValue = result[0].mask.data[i];
            const pixelIndex = i * 4;
            
            // If it's background (high mask value), reduce opacity slightly
            if (maskValue > 0.7) {
              data[pixelIndex + 3] = Math.max(50, data[pixelIndex + 3] * 0.3);
            }
          }
          
          outputCtx.putImageData(outputImageData, 0, 0);
          
          return new Promise((resolve, reject) => {
            outputCanvas.toBlob(
              (blob) => blob ? resolve(blob) : reject(new Error('Failed to create enhanced blob')),
              'image/png',
              0.9
            );
          });
        }
      }
      
      // Fallback to basic resize
      return this.resizeImage(imageElement);
    } catch (error) {
      console.warn('AI enhancement failed, using basic optimization:', error);
      return this.resizeImage(imageElement);
    }
  }

  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
      img.src = url;
    });
  }

  async optimizeImage(url: string, useAI: boolean = true): Promise<string> {
    const cacheKey = this.getCacheKey(url);
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY) {
      return URL.createObjectURL(cached.blob);
    }
    
    // Prevent duplicate processing
    if (this.processingQueue.has(url)) {
      return url; // Return original while processing
    }
    
    this.processingQueue.add(url);
    
    try {
      // Initialize AI model if needed
      if (useAI) {
        await this.initializeModel();
      }
      
      const imageElement = await this.loadImage(url);
      const optimizedBlob = useAI ? 
        await this.enhanceImage(imageElement) : 
        await this.resizeImage(imageElement);
      
      // Cache the result
      this.cache.set(cacheKey, {
        blob: optimizedBlob,
        timestamp: Date.now(),
        optimized: useAI
      });
      
      return URL.createObjectURL(optimizedBlob);
    } catch (error) {
      console.warn(`Failed to optimize image ${url}:`, error);
      return url; // Return original on error
    } finally {
      this.processingQueue.delete(url);
    }
  }

  async preloadImages(urls: string[], useAI: boolean = false): Promise<void> {
    console.log(`Preloading ${urls.length} images...`);
    
    const batchSize = 3; // Process 3 images at a time
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map(url => this.optimizeImage(url, useAI))
      );
    }
    
    console.log('Image preloading completed');
  }

  clearCache(): void {
    // Revoke object URLs to prevent memory leaks
    this.cache.forEach(cached => {
      URL.revokeObjectURL(URL.createObjectURL(cached.blob));
    });
    this.cache.clear();
    console.log('Image cache cleared');
  }

  getCacheStats(): { size: number; optimizedCount: number } {
    const size = this.cache.size;
    const optimizedCount = Array.from(this.cache.values()).filter(cached => cached.optimized).length;
    return { size, optimizedCount };
  }
}

export const imageOptimizer = new ImageOptimizationService();