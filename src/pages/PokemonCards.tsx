
import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PokemonCardSearch from "@/components/pokemon/PokemonCardSearch";
import CardGrid from "@/components/cards/CardGrid";
import { useToast } from "@/hooks/use-toast";
import { getSetById } from "@/services/api/pokemonSetsService";

const PokemonCards = () => {
  const [searchParams] = useSearchParams();
  const setId = searchParams.get('setId');
  const nameQuery = searchParams.get('name');
  const [selectedSetName, setSelectedSetName] = useState<string | null>(null);
  const { toast } = useToast();

  console.log(`PokemonCards page loaded with setId: ${setId}, nameQuery: ${nameQuery}`);

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
        
        <CardGrid setId={setId} nameQuery={nameQuery} />
      </main>
      
      <Footer />
    </div>
  );
};

export default PokemonCards;
