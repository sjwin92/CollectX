-- Fix RLS policies for set_images table to allow public read access
DROP POLICY IF EXISTS "Set images are viewable by everyone" ON set_images;
DROP POLICY IF EXISTS "Authenticated users can manage set images" ON set_images;

-- Create proper RLS policies for set_images
CREATE POLICY "Set images are viewable by everyone" 
ON set_images 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can manage set images" 
ON set_images 
FOR ALL
USING (auth.role() = 'authenticated');

-- Also ensure pokemon_sets and pokemon_cards have proper policies
DROP POLICY IF EXISTS "Pokemon sets are viewable by everyone" ON pokemon_sets;
DROP POLICY IF EXISTS "Pokemon cards are viewable by everyone" ON pokemon_cards;

CREATE POLICY "Pokemon sets are viewable by everyone" 
ON pokemon_sets 
FOR SELECT 
USING (true);

CREATE POLICY "Pokemon cards are viewable by everyone" 
ON pokemon_cards 
FOR SELECT 
USING (true);