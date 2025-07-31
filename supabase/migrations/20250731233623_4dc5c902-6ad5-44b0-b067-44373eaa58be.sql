-- Update card_images table to link to user_cards (if column doesn't exist)
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'card_images' 
        AND column_name = 'user_card_id'
    ) THEN
        ALTER TABLE card_images 
        ADD COLUMN user_card_id UUID REFERENCES user_cards(id) ON DELETE CASCADE;
        
        -- Add index for better performance
        CREATE INDEX idx_card_images_user_card_id ON card_images(user_card_id);
    END IF;
END $$;

-- Make sure we have the right indexes
CREATE INDEX IF NOT EXISTS idx_card_images_user_id ON card_images(user_id);