
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
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import FeaturedBadge from "@/components/marketplace/listing/FeaturedBadge";

// Manual data for latest sets that might not be in the API yet
const newReleases = [
  {
    id: "sv10",
    name: "Glory of Team Rocket",
    series: "Scarlet & Violet",
    printedTotal: 178,
    total: 240,
    legalities: {
      unlimited: "Legal",
      standard: "Legal",
      expanded: "Legal"
    },
    ptcgoCode: "GTR",
    releaseDate: "2025/05/24",
    updatedAt: "2025/05/23 16:00:00",
    images: {
      symbol: "https://images.pokemontcg.io/sv9/symbol.png", // Using placeholder until official image
      logo: "https://cdn2.bulbagarden.net/upload/thumb/3/30/Glory_of_Team_Rocket_logo.png/300px-Glory_of_Team_Rocket_logo.png"
    }
  }
];

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

  // Combine API data with manually added new releases
  const combinedData = React.useMemo(() => {
    if (isLoading || isError || !data) return [];
    
    // For first page only, prepend our new releases
    if (currentPage === 1) {
      return [...newReleases, ...data.data];
    }
    
    return data.data;
  }, [data, isLoading, isError, currentPage]);

  // Get featured sets (first 4 sets from the combined data)
  const featuredSets = combinedData.slice(0, 4) || [];

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
                <Link key={set.id} to={`/pokemon-sets/${set.id}`} className="block h-full">
                  <Card className="overflow-hidden h-full transition-all hover:shadow-lg hover:border-primary/50 relative group border-amber-400/50 shadow">
                    <div className="absolute top-0 left-0 right-0">
                      <FeaturedBadge />
                    </div>
                    <CardHeader className="pt-10">
                      {set.images?.logo ? (
                        <div className="flex justify-center mb-2">
                          <img 
                            src={set.images.logo} 
                            alt={`${set.name} logo`}
                            className="h-16 object-contain mx-auto"
                            onError={(e) => {
                              // If image fails to load, replace with text
                              const target = e.target as HTMLImageElement;
                              const parent = target.parentElement;
                              if (parent) {
                                const nameElement = document.createElement('h3');
                                nameElement.className = 'text-lg font-semibold text-center';
                                nameElement.textContent = set.name;
                                parent.replaceChild(nameElement, target);
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <h3 className="text-lg font-semibold text-center">{set.name}</h3>
                      )}
                    </CardHeader>
                    <CardContent className="pb-4">
                      <div className="flex justify-between items-center mt-2">
                        <div className="flex items-center gap-2">
                          {set.images?.symbol && (
                            <img 
                              src={set.images.symbol} 
                              alt={`${set.name} symbol`}
                              className="h-6 w-6 object-contain"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                          )}
                          <span className="text-sm font-medium">{set.series}</span>
                        </div>
                        <Button variant="outline" size="sm">
                          View Cards
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
              {combinedData.map(set => (
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
                Page {currentPage} of {Math.ceil(((data?.totalCount || 0) + (currentPage === 1 ? newReleases.length : 0)) / 20)}
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
