import React, { useEffect } from 'react';
import { imageOptimizer } from '@/services/ai/imageOptimization';

const ImagePreloader: React.FC = () => {
  useEffect(() => {
    // Preload commonly used images across the site
    const commonImages = [
      '/placeholder.svg',
      'https://archives.bulbagarden.net/media/upload/1/17/Cardback.jpg',
    ];

    // Initialize AI model and preload common images
    imageOptimizer.preloadImages(commonImages, false).catch(console.warn);
    
    // Cleanup cache on unmount
    return () => {
      // Don't clear cache here as it's useful across page navigation
    };
  }, []);

  return null; // This component doesn't render anything
};

export default ImagePreloader;