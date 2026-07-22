-- Create storage bucket for card images
INSERT INTO storage.buckets (id, name, public)
VALUES ('card-images', 'card-images', true);

-- Create storage policies for card images
CREATE POLICY "Anyone can view card images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'card-images');

CREATE POLICY "Users can upload their own card images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'card-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own card images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'card-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own card images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'card-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Update card_images table to link to user_cards
ALTER TABLE card_images 
ADD COLUMN user_card_id UUID REFERENCES user_cards(id) ON DELETE CASCADE;

-- Add index for better performance
CREATE INDEX idx_card_images_user_card_id ON card_images(user_card_id);
CREATE INDEX idx_card_images_user_id ON card_images(user_id);