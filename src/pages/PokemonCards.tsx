import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PokemonCardSearch from "@/components/pokemon/PokemonCardSearch";
import CardGrid from "@/components/cards/CardGrid";
import { Button } from "@/components/ui/button";
import CardFilters, { FilterOptions } from "@/components/pokemon/CardFilters";
import { NoResultsDisplay } from "@/components/common/NoResultsDisplay";
import { useToast } from "@/hooks/use-toast";
import { getSetById } from "@/services/api/pokemonSetsService";
import { getCards, searchCards } from "@/services/api/pokemonCardsService";
import { CardItemProps } from "@/components/cards/CardItem";
import { usdToGbp } from "@/services/currencyService";
import { useSetCards } from "@/hooks/useSetCards";
import type { PokemonCard } from "@/services/api/pokemonTypes";

type TcgplayerPrices = NonNullable<PokemonCard["tcgplayer"]>["prices"];

const extractGbpPrice = (tcgplayer_prices: TcgplayerPrices | undefined): string => {
  const p = tcgplayer_prices;
  const usd =
    p?.holofoil?.market ?? p?.holofoil?.mid ??
    p?.normal?.market ?? p?.normal?.mid ??
    p?.reverseHolofoil?.market ?? p?.reverseHolofoil?.mid ??
    p?.["1stEditionHolofoil"]?.market ??
    p?.unlimitedHolofoil?.market ?? 0;
  return usd > 0 ? `£${usdToGbp(usd).toFixed(2)}` : "N/A";
};

const mapCatalogueCard = (card: PokemonCard): CardItemProps => ({
  id: card.id,
  name: card.name || "Unknown Card",
  imageUrl:
    card.images?.small ||
    card.images?.large ||
    `https://images.pokemontcg.io/${card.id.replace("-", "/")}.png`,
  rarity: card.rarity || "Unknown",
  condition: "Near Mint",
  estimatedValue: card.tcgplayer?.prices
    ? extractGbpPrice(card.tcgplayer.prices)
    : "N/A",
  number: card.number,
  set: { id: card.set?.id, name: card.set?.name },
});

const PAGE_SIZE = 50;

type CataloguePage = { cards: CardItemProps[]; totalCount: number };

const PokemonCards = () => {
  const [searchParams] = useSearchParams();
  const setId = searchParams.get("setId");
  const nameQuery = searchParams.get("name");
  const [selectedSetName, setSelectedSetName] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FilterOptions>({
    sortBy: "value",
    sortOrder: "desc",
    rarityFilter: "all",
    valueRange: "all",
    typeFilter: "all",
  });
  const { toast } = useToast();

  // Set-scoped browsing is served from the owned catalogue mirror.
  const setCardsQuery = useSetCards(setId);

  // Cross-set name search uses the same verified local catalogue.
  const nameSearchQuery = useQuery({
    queryKey: ["name-search", nameQuery, page] as const,
    queryFn: async (): Promise<CataloguePage> => {
      const resp = await searchCards({ name: nameQuery! }, page, PAGE_SIZE);
      return {
        cards: (resp.data ?? []).map(mapCatalogueCard),
        totalCount: resp.totalCount,
      };
    },
    enabled: !!nameQuery && !setId,
    staleTime: 5 * 60 * 1000,
  });

  const browseQuery = useQuery({
    queryKey: ["catalogue-browse", page] as const,
    queryFn: async (): Promise<CataloguePage> => {
      const resp = await getCards(page, PAGE_SIZE);
      return {
        cards: (resp.data ?? []).map(mapCatalogueCard),
        totalCount: resp.totalCount,
      };
    },
    enabled: !setId && !nameQuery,
    staleTime: 5 * 60 * 1000,
  });

  const activeQuery = setId ? setCardsQuery : nameQuery ? nameSearchQuery : browseQuery;
  const pagedData = !setId && activeQuery.data && !Array.isArray(activeQuery.data)
    ? activeQuery.data as CataloguePage
    : null;
  const allCards = useMemo<CardItemProps[]>(
    () => setId
      ? (Array.isArray(activeQuery.data) ? activeQuery.data : [])
      : (pagedData?.cards ?? []),
    [activeQuery.data, pagedData, setId],
  );
  const totalCount = setId ? allCards.length : (pagedData?.totalCount ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const isLoading = activeQuery.isLoading;

  useEffect(() => {
    setPage(1);
  }, [setId, nameQuery]);

  // Surface query errors as toasts (once per change).
  useEffect(() => {
    if (activeQuery.isError) {
      toast({
        title: "Error loading cards",
        description: "There was a problem fetching the cards. Please try again.",
        variant: "destructive",
      });
    }
  }, [activeQuery.isError, toast]);

  // Load the set name for the page header.
  useEffect(() => {
    if (!setId) {
      setSelectedSetName(null);
      return;
    }
    let cancelled = false;
    getSetById(setId)
      .then((setData) => {
        if (!cancelled) setSelectedSetName(setData?.name ?? null);
      })
      .catch(() => {
        if (!cancelled) setSelectedSetName(null);
      });
    return () => {
      cancelled = true;
    };
  }, [setId]);

  // ── Filter + sort the visible cards ───────────────────────────────────────
  const filteredCards = useMemo(() => {
    let filtered = [...allCards];

    if (filters.rarityFilter !== "all") {
      filtered = filtered.filter((card) => {
        const rarity = (card.rarity ?? "").toLowerCase();
        switch (filters.rarityFilter) {
          case "common":      return rarity.includes("common");
          case "uncommon":    return rarity.includes("uncommon");
          case "rare":        return rarity.includes("rare") && !rarity.includes("ultra") && !rarity.includes("secret");
          case "rare-holo":   return rarity.includes("holo");
          case "ultra-rare":  return rarity.includes("ultra");
          case "secret-rare": return rarity.includes("secret");
          case "legendary":   return rarity.includes("legendary");
          case "radiant":     return rarity.includes("radiant");
          case "amazing":     return rarity.includes("amazing");
          default:            return true;
        }
      });
    }

    if (filters.valueRange !== "all") {
      filtered = filtered.filter((card) => {
        const value = parseFloat(card.estimatedValue.replace(/[£,]/g, ""));
        if (isNaN(value)) return false;
        switch (filters.valueRange) {
          case "under-1":  return value < 1;
          case "1-5":      return value >= 1 && value <= 5;
          case "5-20":     return value >= 5 && value <= 20;
          case "20-50":    return value >= 20 && value <= 50;
          case "50-100":   return value >= 50 && value <= 100;
          case "over-100": return value > 100;
          default:         return true;
        }
      });
    }

    const rarityOrder: Record<string, number> = {
      common: 1, uncommon: 2, rare: 3, holo: 4, ultra: 5,
      secret: 6, legendary: 7, radiant: 8, amazing: 9,
    };

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (filters.sortBy) {
        case "value": {
          const av = parseFloat(a.estimatedValue.replace(/[£,]/g, "")) || 0;
          const bv = parseFloat(b.estimatedValue.replace(/[£,]/g, "")) || 0;
          comparison = av - bv;
          break;
        }
        case "rarity":
          comparison =
            (rarityOrder[a.rarity.toLowerCase()] || 0) -
            (rarityOrder[b.rarity.toLowerCase()] || 0);
          break;
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "number":
          comparison = parseInt(a.number || "0") - parseInt(b.number || "0");
          break;
      }
      return filters.sortOrder === "desc" ? -comparison : comparison;
    });

    return filtered;
  }, [allCards, filters]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="container py-8 flex-1">
        <h1 className="text-3xl font-bold mb-2">
          {selectedSetName ? `${selectedSetName} Cards` : "Pokémon Cards"}
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

        {!setId && !nameQuery && (
          <p className="text-muted-foreground mb-6">
            Browse the verified English card catalogue or search by card name.
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
            {Array.from({ length: 10 }).map((_, index) => (
              <div key={index} className="flex flex-col space-y-2">
                <div className="w-full aspect-[2.5/3.5] rounded-lg bg-muted animate-pulse" />
                <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
                <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        ) : filteredCards.length > 0 ? (
          <>
            <CardGrid cards={filteredCards} showCondition={false} />
            {!setId && totalPages > 1 && (
              <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Card catalogue pages">
                <Button
                  variant="outline"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page === 1 || activeQuery.isFetching}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground" aria-live="polite">
                  Page {page} of {totalPages} · {totalCount.toLocaleString()} cards
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={page >= totalPages || activeQuery.isFetching}
                >
                  Next
                </Button>
              </nav>
            )}
          </>
        ) : (
          <NoResultsDisplay
            setId={setId}
            nameQuery={nameQuery}
            onRetry={() => activeQuery.refetch()}
            onClearFilters={() => {
              window.location.href = "/pokemon-cards";
            }}
          />
        )}
      </main>

      <Footer />
    </div>
  );
};

export default PokemonCards;
