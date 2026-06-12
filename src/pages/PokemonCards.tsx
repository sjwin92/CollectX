
import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PokemonCardSearch from "@/components/pokemon/PokemonCardSearch";
import CardGrid from "@/components/cards/CardGrid";
import CardFilters, { FilterOptions } from "@/components/pokemon/CardFilters";
import { NoResultsDisplay } from "@/components/common/NoResultsDisplay";
import { useToast } from "@/hooks/use-toast";
import { getSetById } from "@/services/api/pokemonSetsService";
import { searchCards } from "@/services/api/pokemonCardsService";
import { CardItemProps } from "@/components/cards/CardItem";
import { normalizeSetId } from "@/services/setIdMappingService";
import { supabasePokemonService } from "@/services/supabasePokemonService";
import { enhancedImageService } from "@/services/enhancedImageService";
import { pokemonDataImporter } from "@/services/pokemonDataImporter";
import { usdToGbp } from "@/services/currencyService";

const PokemonCards = () => {
  const [searchParams] = useSearchParams();
  const setId = searchParams.get('setId');
  const nameQuery = searchParams.get('name');
  const [selectedSetName, setSelectedSetName] = useState<string | null>(null);
  const [filteredCards, setFilteredCards] = useState<CardItemProps[]>([]);
  const [allCards, setAllCards] = useState<CardItemProps[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<FilterOptions>({
    sortBy: "value",
    sortOrder: "desc",
    rarityFilter: "all",
    valueRange: "all",
    typeFilter: "all"
  });
  const { toast } = useToast();

  console.log(`PokemonCards page loaded with setId: ${setId}, nameQuery: ${nameQuery}`);

  const extractGbpPrice = (tcgplayer_prices: any): string => {
    const p = tcgplayer_prices;
    const usd =
      p?.holofoil?.market ?? p?.holofoil?.mid ??
      p?.normal?.market ?? p?.normal?.mid ??
      p?.reverseHolofoil?.market ?? p?.reverseHolofoil?.mid ??
      p?.['1stEditionHolofoil']?.market ??
      p?.unlimitedHolofoil?.market ?? 0;
    return usd > 0 ? `£${usdToGbp(usd).toFixed(2)}` : "N/A";
  };

  // Simple in-memory cache keyed by setId/nameQuery so navigating away and
  // back is instant instead of refetching from the external API.
  const cacheRef = React.useRef<Map<string, CardItemProps[]>>(new Map());

  // Load all cards when setId or nameQuery changes
  const loadAllCards = async () => {
    // Nothing to load → don't burn an external API call fetching random cards.
    if (!setId && !nameQuery) {
      setAllCards([]);
      setIsLoading(false);
      return;
    }

    const cacheKey = `${setId ?? ''}|${nameQuery ?? ''}`;
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setAllCards(cached);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const searchParams: Record<string, string> = {};

      if (setId) {
        const normalizedSetId = normalizeSetId(setId);
        searchParams.setId = normalizedSetId;

        // Try the local mirror first (no-op if the table is missing).
        const localCards = await supabasePokemonService.getCardsBySetId(normalizedSetId);
        if (localCards.length > 0) {
          const formattedCards: CardItemProps[] = localCards.map(card => ({
            id: card.id,
            name: card.name || "Unknown Card",
            imageUrl: card.small_image_url || card.large_image_url,
            rarity: card.rarity || "Unknown",
            condition: "Near Mint",
            estimatedValue: extractGbpPrice(card.tcgplayer_prices),
            number: card.number,
            set: { id: card.set_id, name: card.set_name },
          }));
          cacheRef.current.set(cacheKey, formattedCards);
          setAllCards(formattedCards);
          setIsLoading(false);
          return;
        }
      }

      if (nameQuery) {
        searchParams.name = nameQuery.trim();
        const localResults = await supabasePokemonService.searchCards(nameQuery);
        if (localResults.length > 0) {
          const formattedCards: CardItemProps[] = localResults.map(card => ({
            id: card.id,
            name: card.name || "Unknown Card",
            imageUrl: card.small_image_url || card.large_image_url,
            rarity: card.rarity || "Unknown",
            condition: "Near Mint",
            estimatedValue: extractGbpPrice(card.tcgplayer_prices),
            number: card.number,
            set: { id: card.set_id, name: card.set_name },
          }));
          cacheRef.current.set(cacheKey, formattedCards);
          setAllCards(formattedCards);
          setIsLoading(false);
          return;
        }
      }

      // Fallback to external API. Fetch ONE page so the grid paints
      // immediately, then quietly stream additional pages in the background.
      const firstPage = await searchCards(searchParams, 1, 50);
      const formatPage = (data: any[]): CardItemProps[] =>
        data.map(card => ({
          id: card.id,
          name: card.name || "Unknown Card",
          imageUrl:
            card.images?.small ||
            card.images?.large ||
            `https://images.pokemontcg.io/${card.id.replace('-', '/')}.png`,
          rarity: card.rarity || "Unknown",
          condition: "Near Mint",
          estimatedValue: card.tcgplayer?.prices
            ? extractGbpPrice(card.tcgplayer.prices)
            : "N/A",
          number: card.number,
          set: { id: card.set?.id, name: card.set?.name },
        }));

      const firstFormatted = formatPage(firstPage?.data ?? []);
      cacheRef.current.set(cacheKey, firstFormatted);
      setAllCards(firstFormatted);
      setIsLoading(false);

      // Preload first batch of images so the visible grid renders smoothly.
      if (firstFormatted.length > 0) {
        enhancedImageService
          .preloadImages(firstFormatted.slice(0, 10).map(c => c.id), 'low')
          .catch(() => {});
      }

      // Background-fetch additional pages (only if the first looked full).
      if (firstFormatted.length >= 50) {
        (async () => {
          let merged = firstFormatted;
          for (let page = 2; page <= 3; page++) {
            try {
              const resp = await searchCards(searchParams, page, 50);
              const extra = formatPage(resp?.data ?? []);
              if (extra.length === 0) break;
              merged = [...merged, ...extra];
              cacheRef.current.set(cacheKey, merged);
              setAllCards(merged);
              if (extra.length < 50) break;
            } catch {
              break;
            }
          }
        })();
      }
    } catch (error) {
      console.error("Error loading cards:", error);
      toast({
        title: "Error loading cards",
        description: "There was a problem fetching the cards. Please try again.",
        variant: "destructive",
      });
      setAllCards([]);
      setIsLoading(false);
    }
  };

  // Apply filters to the loaded cards
  const applyFilters = (cards: CardItemProps[], filterOptions: FilterOptions): CardItemProps[] => {
    let filtered = [...cards];

    // Rarity filter
    if (filterOptions.rarityFilter !== "all") {
      filtered = filtered.filter(card => {
        const rarity = card.rarity.toLowerCase();
        switch (filterOptions.rarityFilter) {
          case "common":
            return rarity.includes("common");
          case "uncommon":
            return rarity.includes("uncommon");
          case "rare":
            return rarity.includes("rare") && !rarity.includes("ultra") && !rarity.includes("secret");
          case "rare-holo":
            return rarity.includes("holo");
          case "ultra-rare":
            return rarity.includes("ultra");
          case "secret-rare":
            return rarity.includes("secret");
          case "legendary":
            return rarity.includes("legendary");
          case "radiant":
            return rarity.includes("radiant");
          case "amazing":
            return rarity.includes("amazing");
          default:
            return true;
        }
      });
    }

    // Value range filter
    if (filterOptions.valueRange !== "all") {
      filtered = filtered.filter(card => {
        const valueStr = card.estimatedValue.replace(/[£,]/g, '');
        const value = parseFloat(valueStr);
        
        if (isNaN(value)) return filterOptions.valueRange === "all";
        
        switch (filterOptions.valueRange) {
          case "under-1":
            return value < 1;
          case "1-5":
            return value >= 1 && value <= 5;
          case "5-20":
            return value >= 5 && value <= 20;
          case "20-50":
            return value >= 20 && value <= 50;
          case "50-100":
            return value >= 50 && value <= 100;
          case "over-100":
            return value > 100;
          default:
            return true;
        }
      });
    }

    // Sort the cards
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (filterOptions.sortBy) {
        case "value":
          const aValue = parseFloat(a.estimatedValue.replace(/[£,]/g, '')) || 0;
          const bValue = parseFloat(b.estimatedValue.replace(/[£,]/g, '')) || 0;
          comparison = aValue - bValue;
          break;
        case "rarity":
          // Define rarity order
          const rarityOrder: Record<string, number> = {
            "common": 1,
            "uncommon": 2,
            "rare": 3,
            "holo": 4,
            "ultra": 5,
            "secret": 6,
            "legendary": 7,
            "radiant": 8,
            "amazing": 9
          };
          const aRarity = rarityOrder[a.rarity.toLowerCase()] || 0;
          const bRarity = rarityOrder[b.rarity.toLowerCase()] || 0;
          comparison = aRarity - bRarity;
          break;
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "number":
          const aNum = parseInt(a.number || "0");
          const bNum = parseInt(b.number || "0");
          comparison = aNum - bNum;
          break;
        default:
          comparison = 0;
      }
      
      return filterOptions.sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  };

  // If we have a setId, load the set name
  useEffect(() => {
    if (setId) {
      const loadSetName = async () => {
        try {
          console.log(`Fetching set details for setId: ${setId}`);
          const setData = await getSetById(setId);
          if (setData) {
            setSelectedSetName(setData.name);
            console.log(`Loaded set name: ${setData.name} for setId: ${setId}`);
          } else {
            console.error(`Set data not found for setId: ${setId}`);
            setSelectedSetName(null);
          }
        } catch (error) {
          console.error("Error loading set name:", error);
          setSelectedSetName(null);
          toast({
            title: "Error loading set",
            description: "Could not load the set details.",
            variant: "destructive"
          });
        }
      };

      loadSetName();
    } else {
      setSelectedSetName(null);
    }
  }, [setId, toast]);

  // Load cards when setId or nameQuery changes
  useEffect(() => {
    loadAllCards();
  }, [setId, nameQuery]);

  // Apply filters when cards or filters change
  useEffect(() => {
    const filtered = applyFilters(allCards, filters);
    setFilteredCards(filtered);
  }, [allCards, filters]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="container py-8 flex-1">
        <h1 className="text-3xl font-bold mb-2">
          {selectedSetName ? `${selectedSetName} Cards` : 'Pokémon Cards'}
        </h1>
        
        {selectedSetName && (
          <p className="text-muted-foreground mb-6">
            Viewing all cards from the {selectedSetName} set.
          </p>
        )}
        
        {nameQuery && !selectedSetName && (
          <p className="text-muted-foreground mb-6">
            Search results for "{nameQuery}"
          </p>
        )}
        
        <div className="mb-8">
          <PokemonCardSearch initialSetId={setId} />
        </div>
        
        <CardFilters 
          filters={filters}
          onFiltersChange={setFilters}
          resultCount={filteredCards.length}
        />
        
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({length: 10}).map((_, index) => (
              <div key={index} className="flex flex-col space-y-2">
                <div className="w-full aspect-[2.5/3.5] rounded-lg bg-muted animate-pulse" />
                <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
                <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        ) : filteredCards.length > 0 ? (
          <CardGrid cards={filteredCards} showCondition={false} />
        ) : (
          <NoResultsDisplay 
            setId={setId}
            nameQuery={nameQuery}
            onRetry={loadAllCards}
            onClearFilters={() => {
              window.location.href = '/pokemon-cards';
            }}
          />
        )}
      </main>
      
      <Footer />
    </div>
  );
};

export default PokemonCards;
