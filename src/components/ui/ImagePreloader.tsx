import React, { useEffect } from 'react';
import { simpleImageService } from '@/services/simpleImageService';

const ImagePreloader: React.FC = () => {
  useEffect(() => {
    // Preload commonly used images across the site
    const commonImages = [
      '/placeholder.svg',
      'https://archives.bulbagarden.net/media/upload/1/17/Cardback.jpg',
    ];

    // Preload common images with the simple service
    simpleImageService.preloadImages(['placeholder']).catch(console.warn);
    
    // Cleanup cache on unmount
    return () => {
      // Don't clear cache here as it's useful across page navigation
    };
  }, []);

  return null; // This component doesn't render anything
};

export default ImagePreloader;