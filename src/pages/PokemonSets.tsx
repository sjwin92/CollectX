
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAllSets, groupSetsBySeries, PokemonSet, searchSets } from "@/services/pokemonSetsApi";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PokemonSetCard from "@/components/pokemon/PokemonSetCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Search, CalendarRange, X, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import GlassCard from "@/components/ui/custom/GlassCard";
import { useToast } from "@/hooks/use-toast";

const PokemonSets = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredSets, setFilteredSets] = useState<PokemonSet[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { data: allSets = [], isLoading, isError } = useQuery({
    queryKey: ['pokemonSets'],
    queryFn: getAllSets,
  });
  
  useEffect(() => {
    if (!searchQuery) {
      setFilteredSets(allSets);
      return;
    }
    
    const runSearch = async () => {
      setIsSearching(true);
      try {
        const results = await searchSets(allSets, searchQuery);
        setFilteredSets(results);
        
        if (results.length === 0) {
          toast({
            title: "No sets found",
            description: `No Pokémon sets found matching "${searchQuery}"`,
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Search error:', error);
        toast({
          title: "Search error",
          description: "There was a problem searching for sets",
          variant: "destructive"
        });
      } finally {
        setIsSearching(false);
      }
    };
    
    // Debounce search to avoid too many requests
    const timeoutId = setTimeout(() => {
      runSearch();
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [searchQuery, allSets, toast]);
  
  const groupedSets = groupSetsBySeries(filteredSets);
  
  const handleClearSearch = () => {
    setSearchQuery("");
  };
  
  const handleSetClick = (set: PokemonSet) => {
    navigate(`/pokemon-cards?set=${set.id}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <div className="container py-8 flex-1">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Pokémon Trading Card Sets</h1>
          <p className="text-muted-foreground">
            Browse all Pokémon card sets since the beginning, arranged chronologically by series.
            Each set contains unique cards that you can view, collect, and trade.
          </p>
        </div>

        {/* Search and Filter */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by set name, series, or Pokémon name (e.g. 'Charizard')..."
              className="pl-9 pr-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {isSearching && (
              <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
            )}
            {searchQuery && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" 
                onClick={handleClearSearch}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-pulse text-xl">Loading Pokémon card sets...</div>
          </div>
        ) : isError ? (
          <GlassCard variant="dark" className="p-6 text-center">
            <h3 className="text-xl font-medium mb-2">Failed to load Pokémon card sets</h3>
            <p className="text-muted-foreground mb-4">
              There was an error loading the Pokémon card sets database.
            </p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </GlassCard>
        ) : (
          <>
            {filteredSets.length === 0 && !isSearching ? (
              <div className="text-center py-12">
                <p className="text-xl mb-4">No sets found matching "{searchQuery}"</p>
                <Button onClick={handleClearSearch}>Clear Search</Button>
              </div>
            ) : (
              <Accordion 
                type="multiple" 
                defaultValue={groupedSets.map(([series]) => series)}
                className="space-y-6"
              >
                {groupedSets.map(([series, sets]) => (
                  <AccordionItem key={series} value={series} className="border rounded-lg px-2">
                    <AccordionTrigger className="px-4 hover:no-underline">
                      <div className="flex items-center">
                        <CalendarRange className="mr-2 h-5 w-5" />
                        <span>{series}</span>
                        <Badge variant="outline" className="ml-3">
                          {sets.length} sets
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {sets.map((set) => (
                          <PokemonSetCard 
                            key={set.id} 
                            set={set} 
                            onClick={() => handleSetClick(set)} 
                          />
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default PokemonSets;
