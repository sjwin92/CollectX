// Data import service to populate our database with Pokemon data
import { supabasePokemonService } from './supabasePokemonService';
import { searchCards } from './api/pokemonCardsService';
import { getSets } from './api/pokemonSetsService';

class PokemonDataImporter {
  private isImporting = false;

  // Import all Pokemon sets and their data
  async importAllSets(): Promise<void> {
    if (this.isImporting) {
      console.log('Import already in progress');
      return;
    }

    this.isImporting = true;
    console.log('Starting complete Pokemon data import...');

    try {
      // Import all sets (not just popular ones)
      let allSets: any[] = [];
      let page = 1;
      let hasMore = true;

      console.log('Fetching all Pokemon sets...');
      while (hasMore && page <= 50) { // Limit to prevent infinite loops
        try {
          const setsResponse = await getSets(page, 50);
          if (setsResponse?.data?.length > 0) {
            allSets = [...allSets, ...setsResponse.data];
            hasMore = setsResponse.data.length >= 50;
            page++;
            console.log(`Fetched page ${page - 1}, total sets: ${allSets.length}`);
            
            // Add delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 200));
          } else {
            hasMore = false;
          }
        } catch (error) {
          console.error(`Error fetching sets page ${page}:`, error);
          hasMore = false;
        }
      }

      console.log(`Found ${allSets.length} total sets. Starting import...`);

      // Import sets in batches
      const batchSize = 10;
      for (let i = 0; i < allSets.length; i += batchSize) {
        const batch = allSets.slice(i, i + batchSize);
        
        for (const set of batch) {
          try {
            await supabasePokemonService.importSet(set);
            
            // Try to store working image URLs if they exist
            if (set.images?.logo) {
              await this.testAndStoreSetImage(set.id, set.images.logo, 'logo');
            }
            if (set.images?.symbol) {
              await this.testAndStoreSetImage(set.id, set.images.symbol, 'symbol');
            }
            
          } catch (error) {
            console.error(`Error importing set ${set.id}:`, error);
          }
        }
        
        console.log(`Imported batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(allSets.length/batchSize)}`);
        // Add delay between batches
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log(`Imported ${allSets.length} sets with images`);

    } catch (error) {
      console.error('Error during complete data import:', error);
    } finally {
      this.isImporting = false;
    }
  }

  // Test image URL and store if working
  private async testAndStoreSetImage(setId: string, imageUrl: string, type: 'logo' | 'symbol'): Promise<void> {
    try {
      // Test multiple fallback URLs for better coverage
      const fallbackUrls = this.generateFallbackUrls(setId, imageUrl, type);
      
      for (const url of fallbackUrls) {
        try {
          const response = await fetch(url, { method: 'HEAD' });
          if (response.ok) {
            await supabasePokemonService.storeSetImage(setId, url, type);
            console.log(`✓ Stored working ${type} for ${setId}: ${url}`);
            return; // Exit on first working URL
          }
        } catch {
          // Continue to next URL
        }
      }
      
      console.log(`✗ No working ${type} found for ${setId}`);
    } catch (error) {
      console.error(`Error testing ${type} for ${setId}:`, error);
    }
  }

  // Generate fallback URLs for better image coverage
  private generateFallbackUrls(setId: string, originalUrl: string, type: 'logo' | 'symbol'): string[] {
    const urls = [originalUrl];
    
    // Add TCGDex fallbacks
    urls.push(`https://assets.tcgdex.net/en/${setId}/${type}.png`);
    
    // Add LimitlessTCG fallbacks for different generations
    if (setId.startsWith('sv')) {
      urls.push(`https://limitlesstcg.s3.us-east-2.amazonaws.com/pokemon/gen9/${setId}/${type}.png`);
    } else if (setId.startsWith('swsh')) {
      urls.push(`https://limitlesstcg.s3.us-east-2.amazonaws.com/pokemon/gen8/${setId}/${type}.png`);
    }
    
    // Add more fallback patterns
    urls.push(`https://images.pokemontcg.io/${setId}/${type}.png`);
    urls.push(`https://assets.tcgdex.net/en/sets/${setId}/${type}.png`);
    
    return urls.filter(url => url && url !== 'undefined');
  }

  // Import popular sets and their cards (legacy method)
  async importPopularSets(): Promise<void> {
    if (this.isImporting) {
      console.log('Import already in progress');
      return;
    }

    this.isImporting = true;
    console.log('Starting Pokemon data import...');

    try {
      // Popular set IDs to import
      const popularSetIds = [
        'sv10', 'sv9', 'sv8', 'sv7', 'sv6', 'sv5', 'sv4', 'sv3', 'sv2', 'sv1', // Scarlet & Violet
        'sv8pt5', 'sv4pt5', 'sv3pt5', // Special sets
        'swsh12', 'swsh11', 'swsh10', 'swsh9', 'swsh8', // Sword & Shield
        'base1', 'base2', 'base3', // Classic sets
      ];

      // First, get and import set information
      try {
        const setsResponse = await getSets(1, 100);
        if (setsResponse?.data) {
          const setsToImport = setsResponse.data.filter(set => 
            popularSetIds.includes(set.id)
          );

          for (const set of setsToImport) {
            await supabasePokemonService.importSet(set);
          }
          console.log(`Imported ${setsToImport.length} sets`);
        }
      } catch (error) {
        console.error('Error importing sets:', error);
      }

      // Import cards for each set
      let totalCardsImported = 0;
      for (const setId of popularSetIds) {
        try {
          console.log(`Importing cards for set: ${setId}`);
          
          // Get all cards for this set
          let allCards: any[] = [];
          let page = 1;
          let hasMore = true;

          while (hasMore && page <= 10) { // Limit to 10 pages per set
            const response = await searchCards({ setId }, page, 50);
            
            if (response?.data?.length > 0) {
              allCards = [...allCards, ...response.data];
              hasMore = response.data.length >= 50;
              page++;
              
              // Add a small delay to avoid rate limiting
              await new Promise(resolve => setTimeout(resolve, 100));
            } else {
              hasMore = false;
            }
          }

          if (allCards.length > 0) {
            await supabasePokemonService.importCards(allCards);
            totalCardsImported += allCards.length;
            console.log(`Imported ${allCards.length} cards for set ${setId}`);
          }

          // Add delay between sets to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          console.error(`Error importing cards for set ${setId}:`, error);
          // Continue with next set even if one fails
        }
      }

      console.log(`Data import completed! Imported ${totalCardsImported} total cards`);
      
    } catch (error) {
      console.error('Error during data import:', error);
    } finally {
      this.isImporting = false;
    }
  }

  // Import cards for a specific set on demand
  async importSetCards(setId: string): Promise<boolean> {
    try {
      console.log(`Importing cards for set: ${setId}`);
      
      let allCards: any[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore && page <= 20) { // Allow more pages for specific set import
        const response = await searchCards({ setId }, page, 50);
        
        if (response?.data?.length > 0) {
          allCards = [...allCards, ...response.data];
          hasMore = response.data.length >= 50;
          page++;
          
          // Add a small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } else {
          hasMore = false;
        }
      }

      if (allCards.length > 0) {
        await supabasePokemonService.importCards(allCards);
        console.log(`Successfully imported ${allCards.length} cards for set ${setId}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`Error importing cards for set ${setId}:`, error);
      return false;
    }
  }

  // Check if we have data for a set
  async hasSetData(setId: string): Promise<boolean> {
    try {
      const cards = await supabasePokemonService.getCardsBySetId(setId);
      return cards.length > 0;
    } catch (error) {
      console.error('Error checking set data:', error);
      return false;
    }
  }

  get isImportInProgress(): boolean {
    return this.isImporting;
  }
}

export const pokemonDataImporter = new PokemonDataImporter();