import React, { useEffect } from 'react';
import { enhancedImageService } from '@/services/enhancedImageService';

const ImagePreloader: React.FC = () => {
  useEffect(() => {
    // Preload commonly used images across the site
    const commonImages = [
      '/placeholder.svg',
      'https://archives.bulbagarden.net/media/upload/1/17/Cardback.jpg',
    ];

    // Start cache cleanup and preload common images
    enhancedImageService.startCacheCleanup();
    enhancedImageService.preloadImages(['placeholder'], 'low').catch(console.warn);
    
    // Cleanup cache on unmount
    return () => {
      // Don't clear cache here as it's useful across page navigation
    };
  }, []);

  return null; // This component doesn't render anything
};

export default ImagePreloader;