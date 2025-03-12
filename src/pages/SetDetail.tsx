import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getSetById, PokemonSet } from "@/services/pokemonSetsApi";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Calendar, Trophy, Bookmark, Check } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const SetDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: set, isLoading, isError } = useQuery({
    queryKey: ['pokemonSet', id],
    queryFn: () => id ? getSetById(id) : null,
    meta: {
      onError: (error: Error) => {
        toast({
          title: "Error loading set details",
          description: error.message,
          variant: "destructive"
        });
      }
    }
  });

  const handleBack = () => {
    navigate('/pokemon-sets');
  };

  const handleViewCards = () => {
    if (id) {
      navigate(`/pokemon-cards?setId=${id}`);
      toast({
        title: "Loading cards",
        description: `Loading cards from ${set?.name || 'set'}...`
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="container py-8 flex-1">
          <Button variant="ghost" onClick={handleBack} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Sets
          </Button>
          <div className="w-full flex flex-col md:flex-row gap-8">
            <div className="md:w-1/3">
              <Skeleton className="w-full aspect-video rounded-lg" />
            </div>
            <div className="md:w-2/3 space-y-4">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-24 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (isError || !set) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="container py-8 flex-1">
          <Button variant="ghost" onClick={handleBack} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Sets
          </Button>
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Set Not Found</h2>
            <p className="text-muted-foreground mb-6">The Pokémon set you're looking for could not be found.</p>
            <Button onClick={handleBack}>Return to Sets</Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="container py-8 flex-1">
        <Button variant="ghost" onClick={handleBack} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Sets
        </Button>
        
        <div className="w-full flex flex-col md:flex-row gap-8">
          {/* Set Logo and Symbol */}
          <div className="md:w-1/3 space-y-6">
            {set.images.logo ? (
              <div className="bg-card border rounded-lg p-4 flex items-center justify-center">
                <img 
                  src={set.images.logo} 
                  alt={`${set.name} logo`} 
                  className="max-w-full max-h-40 object-contain"
                />
              </div>
            ) : (
              <div className="bg-card border rounded-lg p-4">
                <h2 className="text-2xl font-bold text-center">{set.name}</h2>
              </div>
            )}
            
            {set.images.symbol && (
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <img 
                    src={set.images.symbol} 
                    alt={`${set.name} symbol`} 
                    className="w-10 h-10 object-contain"
                  />
                  <div>
                    <h3 className="font-medium">Set Symbol</h3>
                    <p className="text-sm text-muted-foreground">Official symbol used on cards</p>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="bg-muted/50 p-4 rounded-lg border">
              <h3 className="font-medium mb-2 flex items-center">
                <Calendar className="h-4 w-4 mr-2" /> Release Information
              </h3>
              <p className="text-sm mb-1">
                <span className="text-muted-foreground">Released:</span>{" "}
                {format(new Date(set.releaseDate), 'MMMM d, yyyy')}
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Series:</span>{" "}
                {set.series}
              </p>
            </div>
          </div>
          
          {/* Set Details */}
          <div className="md:w-2/3 space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">{set.name}</h1>
              <div className="flex flex-wrap gap-2 mb-4">
                {set.legalities.standard === 'Legal' && (
                  <Badge variant="default">Standard Legal</Badge>
                )}
                {set.legalities.expanded === 'Legal' && (
                  <Badge variant="secondary">Expanded Legal</Badge>
                )}
                {set.legalities.unlimited === 'Legal' && (
                  <Badge variant="outline">Unlimited Legal</Badge>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <Trophy className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Cards</p>
                    <p className="font-semibold text-lg">{set.printedTotal}</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <Bookmark className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Set ID</p>
                    <p className="font-semibold text-lg">{set.id}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="bg-card p-6 border rounded-lg">
              <h2 className="text-xl font-semibold mb-4">About this Set</h2>
              <p className="text-muted-foreground mb-4">
                {set.name} is part of the {set.series} series and contains {set.printedTotal} cards.
                Released on {format(new Date(set.releaseDate), 'MMMM d, yyyy')}.
              </p>
              
              <Button className="w-full sm:w-auto" onClick={handleViewCards}>
                <Check className="h-4 w-4 mr-2" /> View Cards in this Set
              </Button>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default SetDetail;
