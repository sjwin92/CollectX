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
  
  // Get signed URL (bucket is private)
  const { data: signed, error: signErr } = await supabase.storage
    .from('card-images')
    .createSignedUrl(fileName, 60 * 60 * 24 * 365);
  if (signErr) throw new Error(`Signing failed: ${signErr.message}`);
  const publicUrl = signed.signedUrl;

  
  // Save to database
  const { data: dbData, error: dbError } = await supabase
    .from('card_images')
    .insert({
      user_id: userId,
      card_id: cardId,
      user_card_id: null, // Will be set when card is added to collection
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

// Upload image linked to a specific user card
export const uploadUserCardImage = async (
  file: File, 
  userCardId: string,
  caption?: string
): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Create unique filename
  const fileExt = file.name.split('.').pop();
  const fileName = `${user.id}/${userCardId}/${uuidv4()}.${fileExt}`;

  // Upload file to storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('card-images')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (uploadError) throw uploadError;

  // Get signed URL (bucket is private)
  const { data: signed, error: signErr } = await supabase.storage
    .from('card-images')
    .createSignedUrl(uploadData.path, 60 * 60 * 24 * 365);
  if (signErr) throw signErr;
  const publicUrl = signed.signedUrl;


  // Save image metadata to database
  const { error: dbError } = await supabase
    .from('card_images')
    .insert({
      user_id: user.id,
      user_card_id: userCardId,
      card_id: '', // We'll get this from the user_card if needed
      image_url: publicUrl,
      image_path: uploadData.path,
      caption: caption || '',
      is_primary: false,
      file_size: file.size,
      mime_type: file.type
    });

  if (dbError) throw dbError;

  return publicUrl;
};

// Get card images for a specific user card
export const getUserCardImages = async (userCardId: string) => {
  const { data, error } = await supabase
    .from('card_images')
    .select('*')
    .eq('user_card_id', userCardId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
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

// Set primary image for a user card
export const setPrimaryImage = async (imageId: string, userCardId: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // First, unset all primary images for this card
  await supabase
    .from('card_images')
    .update({ is_primary: false })
    .eq('user_card_id', userCardId)
    .eq('user_id', user.id);

  // Then set the selected image as primary
  const { error } = await supabase
    .from('card_images')
    .update({ is_primary: true })
    .eq('id', imageId)
    .eq('user_id', user.id);

  if (error) throw error;
};