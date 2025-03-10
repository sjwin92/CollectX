
import React from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getCardById } from "@/services/pokemonTcgApi";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PokemonCardDetail from "@/components/pokemon/PokemonCardDetail";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import GlassCard from "@/components/ui/custom/GlassCard";
import { useQuery } from "@tanstack/react-query";

const CardDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { 
    data: card, 
    isLoading, 
    isError, 
    error,
    refetch
  } = useQuery({
    queryKey: ['pokemonCard', id],
    queryFn: async () => {
      if (!id) {
        throw new Error('Card ID is required');
      }
      console.log(`Fetching card details for ID: ${id}`);
      return await getCardById(id);
    },
    retry: 2,
    meta: {
      onError: (err: Error) => {
        console.error('Error loading card:', err);
        toast({
          title: "Failed to load card",
          description: `Could not find card with ID: ${id}`,
          variant: "destructive"
        });
      }
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="container py-8 flex-1">
          <div className="text-center py-12">
            <div className="animate-pulse text-xl">Loading card details...</div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (isError || !card) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="container py-8 flex-1">
          <div className="mb-6">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
          </div>
          
          <GlassCard className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Card Not Found</h1>
            <p className="text-muted-foreground mb-6">
              We couldn't find the card with ID: {id}
            </p>
            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" /> Try Again
              </Button>
              <Link to="/pokemon-cards">
                <Button>Browse All Cards</Button>
              </Link>
            </div>
          </GlassCard>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="container py-8 flex-1">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
        </div>
        
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">{card?.name}</h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>{card?.set.name}</span>
            <span>•</span>
            <span>Card #{card?.number}</span>
            {card?.rarity && (
              <>
                <span>•</span>
                <span>{card?.rarity}</span>
              </>
            )}
          </div>
        </div>
        
        <PokemonCardDetail card={card} />
      </div>
      <Footer />
    </div>
  );
};

export default CardDetail;
