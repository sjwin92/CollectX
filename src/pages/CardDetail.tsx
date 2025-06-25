
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import GlassCard from "@/components/ui/custom/GlassCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle, RefreshCw } from "lucide-react";
import PokemonCardDetail from "@/components/pokemon/PokemonCardDetail";
import { getCardById } from "@/services/api/pokemonCardsService";
import { PokemonCard } from "@/services/api/pokemonTypes";

const CardDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [card, setCard] = useState<PokemonCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("No card ID provided");
      setLoading(false);
      return;
    }

    const fetchCard = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log(`Fetching card details for ID: ${id}`);
        
        const cardData = await getCardById(id);
        setCard(cardData);
        console.log(`Successfully loaded card: ${cardData.name}`);
      } catch (err) {
        console.error("Error fetching card:", err);
        setError(err instanceof Error ? err.message : "Failed to load card");
      } finally {
        setLoading(false);
      }
    };

    fetchCard();
  }, [id]);

  const handleRetry = () => {
    if (id) {
      setError(null);
      setLoading(true);
      // Re-trigger the effect by updating the dependency
      window.location.reload();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 pt-24 pb-16">
          <div className="container">
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading card details...</p>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 pt-24 pb-16">
          <div className="container">
            <Button 
              variant="ghost" 
              onClick={() => navigate(-1)}
              className="mb-6"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            
            <GlassCard className="p-8 text-center">
              <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">Card Not Found</h1>
              <p className="text-muted-foreground mb-6">
                {error || "The requested card could not be found."}
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={handleRetry}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button variant="outline" onClick={() => navigate('/pokemon-cards')}>
                  Browse Cards
                </Button>
              </div>
            </GlassCard>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 pt-24 pb-16">
        <div className="container">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <PokemonCardDetail card={card} />
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default CardDetail;
