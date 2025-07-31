import { useState, useEffect } from 'react';
import { getCardImages, type UploadedCardImage } from '@/services/cardImageUploadService';
import { useUser } from './useUser';

export const useCardImages = (cardId: string) => {
  const [images, setImages] = useState<UploadedCardImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useUser();

  const loadImages = async () => {
    if (!user || !cardId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const cardImages = await getCardImages(cardId, user.id);
      setImages(cardImages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load images');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadImages();
  }, [cardId, user?.id]);

  const handleImageUploaded = (image: UploadedCardImage) => {
    setImages(prev => [image, ...prev]);
  };

  const handleImageRemoved = (imageId: string) => {
    setImages(prev => prev.filter(img => img.id !== imageId));
  };

  const refreshImages = () => {
    loadImages();
  };

  return {
    images,
    loading,
    error,
    handleImageUploaded,
    handleImageRemoved,
    refreshImages
  };
};