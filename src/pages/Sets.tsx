
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSets } from "@/services/pokemonSetsApi";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import SetCard from "@/components/pokemon/SetCard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Plus, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import FeaturedBadge from "@/components/marketplace/listing/FeaturedBadge";

const Sets = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['pokemonSets', currentPage],
    queryFn: () => getSets(currentPage, 20),
    meta: {
      onError: (error: Error) => {
        toast({
          title: "Error loading sets",
          description: error.message,
          variant: "destructive"
        });
      }
    }
  });

  // Get featured sets (first 4 sets from the returned data)
  const featuredSets = data?.data.slice(0, 4) || [];

  const loadNextPage = () => {
    setCurrentPage(prev => prev + 1);
  };

  const loadPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="container py-8 flex-1">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Pokémon Card Sets</h1>
          <p className="text-muted-foreground mb-4">
            Browse all Pokémon Trading Card Game sets, from the latest expansions to the classic Base Set.
          </p>
          <div className="bg-muted/50 p-4 rounded-lg border border-border mb-6">
            <div className="flex items-center gap-2 text-sm">
              <Plus className="h-4 w-4 text-primary" />
              <span className="font-medium">Tip:</span>
              <span>Hover over any set and click the + button to quickly add cards to your collection.</span>
            </div>
          </div>
        </div>

        {/* Featured Sets Section */}
        {!isLoading && !isError && featuredSets.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold mb-2 flex items-center">
                  <Star className="h-5 w-5 text-amber-400 mr-2 fill-amber-400" />
                  Featured Sets
                </h2>
                <p className="text-muted-foreground">
                  Latest and most popular Pokémon card sets
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredSets.map(set => (
                <Link key={set.id} to={`/pokemon-sets/${set.id}`}>
                  <Card className="overflow-hidden h-full transition-all hover:shadow-lg hover:border-primary/50 relative group border-amber-400/50 shadow">
                    <div className="absolute top-0 left-0 right-0">
                      <FeaturedBadge />
                    </div>
                    <CardContent className="pt-10 pb-4">
                      {set.images.logo ? (
                        <img 
                          src={set.images.logo} 
                          alt={`${set.name} logo`}
                          className="h-16 object-contain mb-4"
                        />
                      ) : (
                        <h3 className="text-lg font-semibold mb-2">{set.name}</h3>
                      )}
                      
                      <div className="flex justify-between items-center mt-2">
                        <div className="flex items-center gap-2">
                          {set.images.symbol && (
                            <img 
                              src={set.images.symbol} 
                              alt={`${set.name} symbol`}
                              className="h-6 w-6 object-contain"
                            />
                          )}
                          <span className="text-sm font-medium">{set.series}</span>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/pokemon-cards?setId=${set.id}`}>
                            View Cards
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-4">All Pokémon Sets</h2>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-pulse text-xl">Loading sets...</div>
          </div>
        ) : isError ? (
          <div className="text-center py-12 text-destructive">
            Failed to load sets. Please try again.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {data?.data.map(set => (
                <SetCard key={set.id} set={set} />
              ))}
            </div>

            <div className="flex justify-between items-center mt-8">
              <Button
                variant="outline"
                onClick={loadPreviousPage}
                disabled={currentPage <= 1}
              >
                Previous Page
              </Button>
              <span className="text-muted-foreground">
                Page {currentPage} of {Math.ceil((data?.totalCount || 0) / 20)}
              </span>
              <Button
                variant="outline"
                onClick={loadNextPage}
                disabled={!data || currentPage >= Math.ceil(data.totalCount / 20)}
              >
                Next Page
              </Button>
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Sets;
