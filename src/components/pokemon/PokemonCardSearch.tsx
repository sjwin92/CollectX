
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { PokemonCard, searchCards as searchPokemonTCG } from "@/services/pokemonTcgApi";
import { TCGDexCard, searchCards as searchTCGDex } from "@/services/tcgdexApi";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
        // Map TCGDex results to PokemonCard format for consistency
        searchResults = tcgdexResults.map(card => ({
          id: card.id,
          name: card.name.en,
          supertype: "Pokémon",
          subtypes: [],
          hp: card.hp?.toString(),
          types: card.types,
          rarity: card.rarity,
          images: {
            small: card.variants.normal,
            large: card.variants.normal
          },
          set: {
            id: card.set.id,
            name: card.set.name.en,
            series: "",
            printedTotal: card.set.printedTotal,
            total: card.set.total,
            legalities: {},
            ptcgoCode: "",
            releaseDate: card.set.releaseDate,
            updatedAt: "",
            images: {
              symbol: card.set.symbol,
              logo: card.set.logo
            }
          },
          number: "",
          artist: card.illustrator,
          legalities: {
            standard: card.legal.standard ? "Legal" : "Not Legal",
            expanded: card.legal.expanded ? "Legal" : "Not Legal",
            unlimited: card.legal.unlimited ? "Legal" : "Not Legal"
          }
        }));
      }
      
      setResults(searchResults);
      
      if (searchResults.length === 0) {
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
          />
          {query && (
            <Button 
              type="button" 
              variant="ghost" 
              size="icon" 
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" 
              onClick={clearSearch}
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
                <img 
                  src={card.images.small} 
                  alt={card.name} 
                  className="w-full transition-transform duration-300 group-hover:scale-110"
                />
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
    </div>
  );
};

export default PokemonCardSearch;
