
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, Camera, AlertCircle } from 'lucide-react';
import { uploadCardImage, deleteCardImage, type CardImageUpload, UploadedCardImage } from '@/services/cardImageUploadService';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface CardImageUploadProps {
  cardId: string;
  userId: string;
  existingImages?: UploadedCardImage[];
  onImageUploaded: (image: UploadedCardImage) => void;
  onImageRemoved: (imageId: string) => void;
  maxImages?: number;
}

const CardImageUpload = ({
  cardId,
  userId,
  existingImages = [],
  onImageUploaded,
  onImageRemoved,
  maxImages = 3
}: CardImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please upload an image file (JPG, PNG, etc.)"
      });
      return;
    }
    
    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please upload an image smaller than 5MB"
      });
      return;
    }
    
    // Check max images limit
    if (existingImages.length >= maxImages) {
      toast({
        variant: "destructive",
        title: "Maximum images reached",
        description: `You can only upload up to ${maxImages} images per card`
      });
      return;
    }

    setUploading(true);
    
    try {
      const uploadData: CardImageUpload = {
        file,
        cardId,
        userId
      };
      
      const uploadedImage = await uploadCardImage(uploadData);
      onImageUploaded(uploadedImage);
      
      toast({
        title: "Image uploaded successfully",
        description: "Your card image has been added to your collection"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "There was an error uploading your image. Please try again."
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <Card className={`border-2 border-dashed transition-colors ${
        dragOver 
          ? 'border-primary bg-primary/5' 
          : 'border-muted-foreground/25 hover:border-muted-foreground/50'
      }`}>
        <CardContent 
          className="p-6 text-center cursor-pointer"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
            disabled={uploading || existingImages.length >= maxImages}
          />
          
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Uploading image...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2">
                <Camera className="h-8 w-8 text-muted-foreground" />
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {existingImages.length >= maxImages 
                    ? "Maximum images reached" 
                    : "Upload card condition photo"
                  }
                </p>
                <p className="text-xs text-muted-foreground">
                  {existingImages.length >= maxImages
                    ? `Remove an image to upload a new one`
                    : "Drag & drop or click to browse (Max 5MB)"
                  }
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Existing Images */}
      {existingImages.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {existingImages.map((image) => (
            <div key={image.id} className="relative group">
              <Card className="overflow-hidden">
                <div className="aspect-square relative">
                  <img
                    src={image.url}
                    alt="Card condition"
                    className="w-full h-full object-cover"
                  />
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        await deleteCardImage(image.id);
                        onImageRemoved(image.id);
                        toast({
                          title: "Image deleted",
                          description: "Card image has been removed from your collection"
                        });
                      } catch (error) {
                        toast({
                          variant: "destructive",
                          title: "Delete failed",
                          description: "Failed to delete image. Please try again."
                        });
                      }
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}
      
      {/* Image Guidelines */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Photo Guidelines</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Show the front and back of your card clearly</li>
                <li>• Include any visible wear, scratches, or damage</li>
                <li>• Use good lighting and avoid glare</li>
                <li>• These photos help other traders assess condition</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CardImageUpload;
