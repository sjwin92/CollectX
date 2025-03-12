
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAllSets } from "@/services/pokemonSetsApi";
import { Search } from "lucide-react";
import { PokemonCard } from "@/services/pokemonTcgApi";
import { useNavigate, useSearchParams } from "react-router-dom";

interface PokemonCardSearchProps {
  initialSetId?: string | null;
  onSelect?: (card: PokemonCard) => void;
}

const PokemonCardSearch: React.FC<PokemonCardSearchProps> = ({ initialSetId = null, onSelect }) => {
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
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Build the new URL with search parameters
    const params = new URLSearchParams();
    
    if (nameQuery) {
      params.append('name', nameQuery);
    }
    
    if (selectedSet) {
      params.append('setId', selectedSet);
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
    
    // If user is just changing the set (without a name query), 
    // automatically submit the form to update results
    const params = new URLSearchParams();
    if (value) {
      params.append('setId', value);
    }
    if (nameQuery) {
      params.append('name', nameQuery);
    }
    
    navigate({
      pathname: '/pokemon-cards',
      search: params.toString()
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-5">
          <Input
            placeholder="Search card name..."
            value={nameQuery}
            onChange={(e) => setNameQuery(e.target.value)}
            className="w-full"
          />
        </div>
        
        <div className="md:col-span-5">
          <Select value={selectedSet} onValueChange={handleSetChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select a set" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Sets</SelectItem>
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
