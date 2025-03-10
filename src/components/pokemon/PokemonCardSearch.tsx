
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Info, AlertTriangle } from "lucide-react";
import { PokemonCard, searchCards as searchPokemonTCG } from "@/services/pokemonTcgApi";
import { searchCards as searchTCGDex, TCGDexCard } from "@/services/tcgdexApi";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PokemonCardSearchProps {
  onSelect: (card: PokemonCard) => void;
}

const PokemonCardSearch = ({ onSelect }: PokemonCardSearchProps) => {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<PokemonCard[]>([]);
  const [source, setSource] = useState<"pokemontcg" | "tcgdex">("pokemontcg");
  const { toast } = useToast();
  
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setIsSearching(true);
    
    try {
      let searchResults;
      if (source === "pokemontcg") {
        const response = await searchPokemonTCG(query);
        searchResults = response.data;
      } else {
        const tcgdexResults = await searchTCGDex(query);
        
        // Transform TCGDexCard to PokemonCard format
        searchResults = tcgdexResults.map((card: TCGDexCard) => ({
          id: card.id,
          name: card.name,
          supertype: "Pokémon",
          subtypes: [],
          hp: card.hp || "0",
          types: card.types || [],
          rarity: card.rarity || "",
          images: {
            small: card.variants?.normal || card.image,
            large: card.variants?.normal || card.image
          },
          set: {
            id: card.set.id,
            name: card.set.name,
            series: "",
            printedTotal: card.set.printedTotal || 0,
            total: card.set.total || 0,
            legalities: {},
            ptcgoCode: "",
            releaseDate: card.set.releaseDate || "",
            updatedAt: "",
            images: {
              symbol: card.set.symbol || "",
              logo: card.set.logo || ""
            }
          },
          number: card.localId || "",
          artist: card.illustrator || "",
          legalities: {
            standard: card.legal?.standard ? "Legal" : "Not Legal",
            expanded: card.legal?.expanded ? "Legal" : "Not Legal",
            unlimited: card.legal?.unlimited ? "Legal" : "Not Legal"
          }
        }));
      }
      
      setResults(searchResults || []);
      
      if (!searchResults || searchResults.length === 0) {
        toast({
          title: "No cards found",
          description: "Try a different search term",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Search error:", error);
      toast({
        title: "Search failed",
        description: "There was an error searching for cards",
        variant: "destructive"
      });
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };
  
  const clearSearch = () => {
    setQuery("");
    setResults([]);
  };
  
  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search cards by name, set, type..."
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search for Pokémon cards"
          />
          {query && (
            <Button 
              type="button" 
              variant="ghost" 
              size="icon" 
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" 
              onClick={clearSearch}
              aria-label="Clear search"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <Select value={source} onValueChange={(value: "pokemontcg" | "tcgdex") => setSource(value)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Select source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pokemontcg">Pokemon TCG</SelectItem>
            <SelectItem value="tcgdex">TCG Dex</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit" disabled={isSearching}>
          {isSearching ? "Searching..." : "Search"}
        </Button>
      </form>
      
      {results.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-h-[400px] overflow-y-auto p-1">
          {results.map(card => (
            <div 
              key={card.id} 
              className="cursor-pointer group relative"
              onClick={() => onSelect(card)}
            >
              <div className="overflow-hidden rounded-lg">
                {card.images.small ? (
                  <div className="relative">
                    <img 
                      src={card.images.small} 
                      alt={`Pokémon card: ${card.name} from set ${card.set.name}`}
                      className="w-full transition-transform duration-300 group-hover:scale-110"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/placeholder.svg";
                        (e.target as HTMLImageElement).setAttribute('data-placeholder', 'true');
                      }}
                      loading="lazy"
                    />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="absolute top-1 right-1 bg-black/60 rounded-full p-1">
                            <Info className="h-3 w-3 text-white" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Card: {card.name}</p>
                          <p>Set: {card.set.name}</p>
                          <p>Source: {source === "pokemontcg" ? "Pokemon TCG API" : "TCG Dex API"}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                ) : (
                  <div className="bg-muted aspect-[2.5/3.5] flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-amber-500 mb-1" />
                    <span className="text-muted-foreground text-xs">Image Unavailable</span>
                  </div>
                )}
              </div>
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-sm font-medium text-center px-2">
                  {card.name}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {query && results.length === 0 && !isSearching && (
        <div className="flex flex-col items-center justify-center p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-amber-500 mb-2" />
          <p className="text-muted-foreground">No cards found for "{query}"</p>
          <p className="text-sm text-muted-foreground">Try a different search term or data source</p>
        </div>
      )}
    </div>
  );
};

export default PokemonCardSearch;
