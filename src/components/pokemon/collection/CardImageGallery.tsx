import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, Eye, Star } from 'lucide-react';
import { getUserCardImages } from '@/services/cardImageUploadService';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface CardImageGalleryProps {
  userCardId: string;
  cardName: string;
  className?: string;
}

const CardImageGallery: React.FC<CardImageGalleryProps> = ({ 
  userCardId, 
  cardName, 
  className = "" 
}) => {
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  useEffect(() => {
    if (userCardId) {
      loadImages();
    }
  }, [userCardId]);

  const loadImages = async () => {
    setLoading(true);
    try {
      const imageData = await getUserCardImages(userCardId);
      setImages(imageData);
    } catch (error) {
      console.error('Error loading card images:', error);
    } finally {
      setLoading(false);
    }
  };

  const openImageViewer = (image: any) => {
    setSelectedImage(image);
    setViewerOpen(true);
  };

  if (loading) {
    return (
      <div className={`flex items-center gap-2 text-muted-foreground ${className}`}>
        <Camera className="h-4 w-4 animate-pulse" />
        <span className="text-sm">Loading images...</span>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className={`flex items-center gap-2 text-muted-foreground ${className}`}>
        <Camera className="h-4 w-4" />
        <span className="text-sm">No condition photos</span>
      </div>
    );
  }

  const primaryImage = images.find(img => img.is_primary) || images[0];

  return (
    <>
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4 text-primary" />
          <Badge variant="secondary" className="text-xs">
            {images.length} photo{images.length > 1 ? 's' : ''}
          </Badge>
        </div>

        {/* Primary Image Preview */}
        <Card 
          className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => openImageViewer(primaryImage)}
        >
          <CardContent className="p-0">
            <div className="aspect-square relative">
              <img
                src={primaryImage.image_url}
                alt={`Condition photo of ${cardName}`}
                className="w-full h-full object-cover"
              />
              
              {/* Overlay with view icon */}
              <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center">
                <Eye className="h-6 w-6 text-white opacity-0 hover:opacity-100 transition-opacity" />
              </div>
              
              {/* Primary badge */}
              {primaryImage.is_primary && (
                <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs flex items-center gap-1">
                  <Star className="h-3 w-3 fill-current" />
                  Primary
                </div>
              )}
              
              {/* Image count badge */}
              {images.length > 1 && (
                <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                  +{images.length - 1} more
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Additional Images Thumbnails */}
        {images.length > 1 && (
          <div className="grid grid-cols-3 gap-1">
            {images.slice(1, 4).map((image) => (
              <div 
                key={image.id}
                className="aspect-square relative cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => openImageViewer(image)}
              >
                <img
                  src={image.image_url}
                  alt={`Condition photo of ${cardName}`}
                  className="w-full h-full object-cover rounded border"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Image Viewer Dialog */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              {cardName} - Condition Photos
            </DialogTitle>
          </DialogHeader>
          
          {selectedImage && (
            <div className="space-y-4">
              <div className="aspect-square relative">
                <img
                  src={selectedImage.image_url}
                  alt={`Condition photo of ${cardName}`}
                  className="w-full h-full object-contain rounded-lg"
                />
                
                {selectedImage.is_primary && (
                  <Badge className="absolute top-4 left-4 flex items-center gap-1">
                    <Star className="h-3 w-3 fill-current" />
                    Primary Photo
                  </Badge>
                )}
              </div>
              
              {selectedImage.caption && (
                <p className="text-sm text-muted-foreground italic">
                  "{selectedImage.caption}"
                </p>
              )}
              
              {/* Thumbnail navigation */}
              {images.length > 1 && (
                <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                  {images.map((image) => (
                    <button
                      key={image.id}
                      className={`aspect-square relative border-2 rounded transition-colors ${
                        selectedImage.id === image.id 
                          ? 'border-primary' 
                          : 'border-transparent hover:border-muted-foreground/50'
                      }`}
                      onClick={() => setSelectedImage(image)}
                    >
                      <img
                        src={image.image_url}
                        alt={`Condition photo of ${cardName}`}
                        className="w-full h-full object-cover rounded"
                      />
                      {image.is_primary && (
                        <Star className="absolute top-1 right-1 h-3 w-3 text-primary fill-current" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CardImageGallery;