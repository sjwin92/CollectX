
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export interface CardImageUpload {
  file: File;
  cardId: string;
  userId: string;
  caption?: string;
}

export interface UploadedCardImage {
  id: string;
  url: string;
  cardId: string;
  userId: string;
  uploadedAt: string;
  caption?: string;
  isPrimary?: boolean;
}

// Upload card image to Supabase Storage
export const uploadCardImage = async (upload: CardImageUpload): Promise<UploadedCardImage> => {
  const { file, cardId, userId, caption } = upload;
  
  // Create unique file name
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${cardId}/${uuidv4()}.${fileExt}`;
  
  // Upload to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('card-images')
    .upload(fileName, file);
    
  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('card-images')
    .getPublicUrl(fileName);
  
  // Save to database
  const { data: dbData, error: dbError } = await supabase
    .from('card_images')
    .insert({
      user_id: userId,
      card_id: cardId,
      image_url: publicUrl,
      image_path: fileName,
      file_size: file.size,
      mime_type: file.type,
      caption: caption || null
    })
    .select()
    .single();
    
  if (dbError) {
    // Clean up uploaded file if database insert fails
    await supabase.storage.from('card-images').remove([fileName]);
    throw new Error(`Database error: ${dbError.message}`);
  }
  
  return {
    id: dbData.id,
    url: dbData.image_url,
    cardId: dbData.card_id,
    userId: dbData.user_id,
    uploadedAt: dbData.created_at,
    caption: dbData.caption,
    isPrimary: dbData.is_primary
  };
};

// Get card images for a specific card
export const getCardImages = async (cardId: string, userId: string): Promise<UploadedCardImage[]> => {
  const { data, error } = await supabase
    .from('card_images')
    .select('*')
    .eq('card_id', cardId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
    
  if (error) {
    throw new Error(`Failed to fetch images: ${error.message}`);
  }
  
  return data.map(img => ({
    id: img.id,
    url: img.image_url,
    cardId: img.card_id,
    userId: img.user_id,
    uploadedAt: img.created_at,
    caption: img.caption,
    isPrimary: img.is_primary
  }));
};

// Delete card image
export const deleteCardImage = async (imageId: string): Promise<boolean> => {
  // Get image data first to remove from storage
  const { data: imageData, error: fetchError } = await supabase
    .from('card_images')
    .select('image_path')
    .eq('id', imageId)
    .single();
    
  if (fetchError) {
    throw new Error(`Failed to fetch image: ${fetchError.message}`);
  }
  
  // Remove from storage
  const { error: storageError } = await supabase.storage
    .from('card-images')
    .remove([imageData.image_path]);
    
  if (storageError) {
    console.warn('Failed to remove file from storage:', storageError);
  }
  
  // Remove from database
  const { error: dbError } = await supabase
    .from('card_images')
    .delete()
    .eq('id', imageId);
    
  if (dbError) {
    throw new Error(`Failed to delete image: ${dbError.message}`);
  }
  
  return true;
};
