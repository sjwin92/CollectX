import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAllSets } from "@/services/api/pokemonSetsService";
import { Search, HelpCircle } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { trackSearch } from "@/services/supabaseAnalyticsService";

interface PokemonCardSearchProps {
  initialSetId?: string | null;
}

const PokemonCardSearch: React.FC<PokemonCardSearchProps> = ({ initialSetId = null }) => {
  const [nameQuery, setNameQuery] = useState("");
  const [selectedSet, setSelectedSet] = useState<string>("");
  const [sets, setSets] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Load available sets
  useEffect(() => {
    const loadSets = async () => {
      setIsLoading(true);
      try {
        const allSets = await getAllSets();
        setSets(allSets);
        console.log(`Loaded ${allSets.length} sets for dropdown`);
      } catch (error) {
        console.error("Error loading sets for search:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSets();
  }, []);
  
  // Initialize name query from URL params
  useEffect(() => {
    const nameFromUrl = searchParams.get('name');
    if (nameFromUrl) {
      setNameQuery(nameFromUrl);
    }
  }, [searchParams]);
  
  // Set the initial set value based on URL params or props
  useEffect(() => {
    // Check for initialSetId prop first
    if (initialSetId) {
      console.log(`Setting selectedSet from initialSetId: ${initialSetId}`);
      setSelectedSet(initialSetId);
    } else {
      // Check URL params if no initialSetId
      const setIdFromUrl = searchParams.get('setId');
      if (setIdFromUrl) {
        console.log(`Setting selectedSet from URL param: ${setIdFromUrl}`);
        setSelectedSet(setIdFromUrl);
      }
    }
  }, [initialSetId, searchParams]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Build the new URL with search parameters
    const params = new URLSearchParams();
    
    if (nameQuery) {
      params.append('name', nameQuery.trim());
    }
    
    if (selectedSet && selectedSet !== 'all') {
      params.append('setId', selectedSet);
    }
    
    // Track the search activity
    try {
      await trackSearch(
        nameQuery.trim() || 'all cards',
        'cards',
        0, // Results count will be updated on the results page
        { set_id: selectedSet }
      );
    } catch (error) {
      console.error('Error tracking search:', error);
    }
    
    // Navigate to the same page but with new query parameters
    console.log(`Navigating to search with params: ${params.toString()}`);
    navigate({
      pathname: '/pokemon-cards',
      search: params.toString()
    });
  };
  
  const handleSetChange = (value: string) => {
    console.log(`Set selection changed to: ${value}`);
    setSelectedSet(value);
    
    // Only auto-submit when changing the set if there's no name query
    if (!nameQuery.trim()) {
      const params = new URLSearchParams();
      if (value && value !== 'all') {
        params.append('setId', value);
      }
      
      navigate({
        pathname: '/pokemon-cards',
        search: params.toString()
      });
    }
    // Otherwise, the user will need to click the search button to submit the combined query
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-5 relative">
          <div className="relative">
            <Input
              placeholder="Search by card name (for example, Charizard)..."
              value={nameQuery}
              onChange={(e) => setNameQuery(e.target.value)}
              className="w-full pr-10"
            />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute right-0 top-0 h-full"
                    type="button"
                  >
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="text-sm">
                    Search the verified CollectX catalogue by card name, then narrow the results to a set if needed.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        <div className="md:col-span-5">
          <Select value={selectedSet} onValueChange={handleSetChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select a set" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sets</SelectItem>
              {sets.map((set) => (
                <SelectItem key={set.id} value={set.id}>
                  {set.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="md:col-span-2">
          <Button type="submit" className="w-full">
            <Search className="mr-2 h-4 w-4" />
            Search
          </Button>
        </div>
      </div>
    </form>
  );
};

export default PokemonCardSearch;
