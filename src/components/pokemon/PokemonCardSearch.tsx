
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAllSets } from "@/services/pokemonSetsApi";
import { Search } from "lucide-react";
import { PokemonCard } from "@/services/pokemonTcgApi";

interface PokemonCardSearchProps {
  initialSetId?: string | null;
  onSelect?: (card: PokemonCard) => void;
}

const PokemonCardSearch: React.FC<PokemonCardSearchProps> = ({ initialSetId = null, onSelect }) => {
  const [nameQuery, setNameQuery] = useState("");
  const [selectedSet, setSelectedSet] = useState<string>(initialSetId || "");
  const [sets, setSets] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Load available sets
  useEffect(() => {
    const loadSets = async () => {
      setIsLoading(true);
      try {
        const allSets = await getAllSets();
        setSets(allSets);
      } catch (error) {
        console.error("Error loading sets for search:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSets();
  }, []);
  
  // Set the initial set if provided
  useEffect(() => {
    if (initialSetId) {
      setSelectedSet(initialSetId);
    }
  }, [initialSetId]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Trigger search logic here
    console.log("Searching for:", { nameQuery, selectedSet });
    
    // You would typically update URL params or call a parent component's search function
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
          <Select value={selectedSet} onValueChange={setSelectedSet}>
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
