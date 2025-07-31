// Supabase Pokemon data service for reliable local data storage
import { supabase } from '@/integrations/supabase/client';

interface PokemonSet {
  id: string;
  name: string;
  series?: string;
  printed_total?: number;
  total?: number;
  ptcgo_code?: string;
  release_date?: string;
  logo_url?: string;
  symbol_url?: string;
  legalities?: any;
  images?: any;
}

interface PokemonCard {
  id: string;
  name: string;
  supertype?: string;
  subtypes?: string[];
  hp?: string;
  types?: string[];
  set_id?: string;
  set_name?: string;
  number?: string;
  artist?: string;
  rarity?: string;
  flavor_text?: string;
  images?: any;
  tcgplayer_prices?: any;
  small_image_url?: string;
  large_image_url?: string;
}

class SupabasePokemonService {
  // Import set data from external API to our database
  async importSet(setData: any): Promise<void> {
    try {
      const setToInsert: PokemonSet = {
        id: setData.id,
        name: setData.name,
        series: setData.series,
        printed_total: setData.printedTotal,
        total: setData.total,
        ptcgo_code: setData.ptcgoCode,
        release_date: setData.releaseDate,
        logo_url: setData.images?.logo,
        symbol_url: setData.images?.symbol,
        legalities: setData.legalities,
        images: setData.images
      };

      const { error } = await supabase
        .from('pokemon_sets')
        .upsert(setToInsert);

      if (error) throw error;
      console.log(`Imported set: ${setData.name}`);
    } catch (error) {
      console.error('Error importing set:', error);
    }
  }

  // Import card data from external API to our database
  async importCards(cardsData: any[]): Promise<void> {
    try {
      const cardsToInsert: PokemonCard[] = cardsData.map(card => ({
        id: card.id,
        name: card.name,
        supertype: card.supertype,
        subtypes: card.subtypes,
        hp: card.hp,
        types: card.types,
        set_id: card.set?.id,
        set_name: card.set?.name,
        number: card.number,
        artist: card.artist,
        rarity: card.rarity,
        flavor_text: card.flavorText,
        images: card.images,
        tcgplayer_prices: card.tcgplayer?.prices,
        small_image_url: card.images?.small,
        large_image_url: card.images?.large
      }));

      // Insert in batches to avoid overwhelming the database
      const batchSize = 50;
      for (let i = 0; i < cardsToInsert.length; i += batchSize) {
        const batch = cardsToInsert.slice(i, i + batchSize);
        const { error } = await supabase
          .from('pokemon_cards')
          .upsert(batch);

        if (error) {
          console.error('Error importing card batch:', error);
        } else {
          console.log(`Imported ${batch.length} cards (batch ${Math.floor(i/batchSize) + 1})`);
        }
      }
    } catch (error) {
      console.error('Error importing cards:', error);
    }
  }

  // Get cards from our database by set ID
  async getCardsBySetId(setId: string): Promise<PokemonCard[]> {
    try {
      const { data, error } = await supabase
        .from('pokemon_cards')
        .select('*')
        .eq('set_id', setId)
        .order('number');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching cards from database:', error);
      return [];
    }
  }

  // Get set information from our database
  async getSetById(setId: string): Promise<PokemonSet | null> {
    try {
      const { data, error } = await supabase
        .from('pokemon_sets')
        .select('*')
        .eq('id', setId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching set from database:', error);
      return null;
    }
  }

  // Get all sets from our database
  async getAllSets(): Promise<PokemonSet[]> {
    try {
      const { data, error } = await supabase
        .from('pokemon_sets')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching sets from database:', error);
      return [];
    }
  }

  // Search cards in our database
  async searchCards(query: string, setId?: string): Promise<PokemonCard[]> {
    try {
      let queryBuilder = supabase
        .from('pokemon_cards')
        .select('*');

      if (setId) {
        queryBuilder = queryBuilder.eq('set_id', setId);
      }

      if (query) {
        queryBuilder = queryBuilder.or(`name.ilike.%${query}%,rarity.ilike.%${query}%`);
      }

      const { data, error } = await queryBuilder
        .order('name')
        .limit(100);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching cards in database:', error);
      return [];
    }
  }

  // Store working image URLs in the existing card_images table structure
  async storeWorkingImageUrl(cardId: string, imageUrl: string, imageType: 'small' | 'large', userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('card_images')
        .upsert({
          card_id: cardId,
          image_url: imageUrl,
          image_path: imageUrl, // Use the same URL as path
          user_id: userId,
          mime_type: 'image/png'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error storing image URL:', error);
    }
  }

  // Get working image URLs for a card from the existing table structure
  async getWorkingImageUrls(cardId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('card_images')
        .select('image_url')
        .eq('card_id', cardId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data?.map(item => item.image_url) || [];
    } catch (error) {
      console.error('Error fetching working image URLs:', error);
      return [];
    }
  }
}

export const supabasePokemonService = new SupabasePokemonService();