import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAllSets } from "@/services/api/pokemonSetsService";
import { Search, HelpCircle, Sparkles } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { recordSearch as trackSearch } from "@/services/supabaseAnalyticsService";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PokemonCardSearchProps {
  initialSetId?: string | null;
  onSelect?: (card: any) => void;
}

const PokemonCardSearch: React.FC<PokemonCardSearchProps> = ({ initialSetId = null, onSelect }) => {
  const [nameQuery, setNameQuery] = useState("");
  const [selectedSet, setSelectedSet] = useState<string>("");
  const [sets, setSets] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAISearching, setIsAISearching] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
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

  const handleAISearch = async () => {
    if (!nameQuery.trim()) {
      toast({
        title: "Enter a search query",
        description: "Please enter what you're looking for to use AI search.",
        variant: "destructive"
      });
      return;
    }

    setIsAISearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-card-search', {
        body: { query: nameQuery }
      });

      if (error) throw error;

      // Apply AI suggestions to the search form
      if (data.name) {
        setNameQuery(data.name);
      }
      
      if (data.setName && sets.length > 0) {
        const matchingSet = sets.find(set => 
          set.name.toLowerCase().includes(data.setName.toLowerCase()) ||
          data.setName.toLowerCase().includes(set.name.toLowerCase())
        );
        if (matchingSet) {
          setSelectedSet(matchingSet.id);
        }
      }

      toast({
        title: "AI Search Applied",
        description: data.interpretation || "AI has interpreted your search and updated the form.",
      });

      // Auto-submit the enhanced search
      setTimeout(() => {
        const form = document.querySelector('form');
        if (form) {
          form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
      }, 100);

    } catch (error) {
      console.error('AI search error:', error);
      toast({
        title: "AI Search Error",
        description: "AI search is temporarily unavailable. Using regular search.",
        variant: "destructive"
      });
    } finally {
      setIsAISearching(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-5 relative">
          <div className="relative">
            <Input
              placeholder="Search by card name or number (e.g., 25/100, SVI004)..."
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
                    Search by card name (e.g., "Charizard") or card number in different formats:
                  </p>
                  <ul className="text-xs mt-1 list-disc pl-4">
                    <li>Collector Number: 25/100</li>
                    <li>Card Number only: 25</li>
                    <li>Set Code + Number: SVI025</li>
                  </ul>
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
        
        <div className="md:col-span-2 space-y-2">
          <Button type="submit" className="w-full">
            <Search className="mr-2 h-4 w-4" />
            Search
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            className="w-full" 
            onClick={handleAISearch}
            disabled={isAISearching}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {isAISearching ? "AI Searching..." : "AI Search"}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default PokemonCardSearch;
