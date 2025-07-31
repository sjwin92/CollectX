// Data import service to populate our database with Pokemon data
import { supabasePokemonService } from './supabasePokemonService';
import { searchCards } from './api/pokemonCardsService';
import { getSets } from './api/pokemonSetsService';

class PokemonDataImporter {
  private isImporting = false;

  // Import popular sets and their cards
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