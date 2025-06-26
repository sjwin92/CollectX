
import { v4 as uuidv4 } from 'uuid';

export interface CardImageUpload {
  file: File;
  cardId: string;
  userId: string;
}

export interface UploadedCardImage {
  id: string;
  url: string;
  cardId: string;
  userId: string;
  uploadedAt: string;
}

// Simulate image upload service
export const uploadCardImage = async (upload: CardImageUpload): Promise<UploadedCardImage> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // In a real app, this would upload to a cloud storage service
      const imageUrl = URL.createObjectURL(upload.file);
      
      resolve({
        id: uuidv4(),
        url: imageUrl,
        cardId: upload.cardId,
        userId: upload.userId,
        uploadedAt: new Date().toISOString()
      });
    }, 1000);
  });
};

export const deleteCardImage = async (imageId: string): Promise<boolean> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, 500);
  });
};
