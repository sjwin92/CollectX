
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSets } from "@/services/pokemonSetsApi";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import SetCard from "@/components/pokemon/SetCard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Plus, Star, ImageOff } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import FeaturedBadge from "@/components/marketplace/listing/FeaturedBadge";
import { fixImageUrl, getSetImageFallbacks } from "@/services/api/cardImageService";


const Sets = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [imageErrors, setImageErrors] = useState<Record<string, { logo: number; symbol: number }>>({});
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

  // Use API data directly
  const combinedData = React.useMemo(() => {
    if (isLoading || isError || !data) return [];
    return data.data;
  }, [data, isLoading, isError]);

  // Get featured sets (first 4 sets with enhanced SV image loading)
  const featuredSets = combinedData.slice(0, 4) || [];

  // Handle image error with fallback logic
  const handleImageError = (setId: string, type: 'logo' | 'symbol', element: HTMLImageElement) => {
    const currentErrors = imageErrors[setId] || { logo: 0, symbol: 0 };
    const currentFallbackIndex = currentErrors[type];
    const fallbacks = getSetImageFallbacks(setId, type);
    
    if (currentFallbackIndex + 1 < fallbacks.length) {
      const nextFallbackIndex = currentFallbackIndex + 1;
      element.src = fallbacks[nextFallbackIndex];
      
      setImageErrors(prev => ({
        ...prev,
        [setId]: {
          ...prev[setId],
          [type]: nextFallbackIndex
        }
      }));
    } else {
      // No more fallbacks available, hide the image
      element.style.display = 'none';
    }
  };

  // Get current image URL with fallback support
  const getImageUrl = (setId: string, type: 'logo' | 'symbol', originalUrl?: string) => {
    const currentErrors = imageErrors[setId] || { logo: 0, symbol: 0 };
    const fallbackIndex = currentErrors[type];
    
    if (fallbackIndex > 0) {
      const fallbacks = getSetImageFallbacks(setId, type);
      return fallbacks[fallbackIndex] || originalUrl;
    }
    
    return fixImageUrl(originalUrl, setId, type);
  };

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
              {featuredSets.map(set => {
                const logoUrl = getImageUrl(set.id, 'logo', set.images?.logo);
                const symbolUrl = getImageUrl(set.id, 'symbol', set.images?.symbol);
                
                return (
                  <Link key={set.id} to={`/pokemon-sets/${set.id}`} className="block h-full">
                    <Card className="overflow-hidden h-full transition-all hover:shadow-lg hover:border-primary/50 relative group border-amber-400/50 shadow">
                      <div className="absolute top-0 left-0 right-0">
                        <FeaturedBadge />
                      </div>
                      <CardHeader className="pt-10">
                        {logoUrl ? (
                          <div className="flex justify-center mb-2">
                            <img 
                              src={logoUrl} 
                              alt={`${set.name} logo`}
                              className="h-16 object-contain mx-auto"
                              onError={(e) => handleImageError(set.id, 'logo', e.currentTarget)}
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center mb-2">
                            <h3 className="text-lg font-semibold text-center">{set.name}</h3>
                            <div className="text-muted-foreground flex items-center mt-1 text-xs">
                              <ImageOff className="h-3 w-3 mr-1" />
                              <span>Logo unavailable</span>
                            </div>
                          </div>
                        )}
                      </CardHeader>
                      <CardContent className="pb-4">
                        <div className="flex justify-between items-center mt-2">
                          <div className="flex items-center gap-2">
                            {symbolUrl ? (
                              <img 
                                src={symbolUrl} 
                                alt={`${set.name} symbol`}
                                className="h-6 w-6 object-contain"
                                onError={(e) => handleImageError(set.id, 'symbol', e.currentTarget)}
                              />
                            ) : (
                              <ImageOff className="h-4 w-4 text-muted-foreground" />
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
                );
              })}
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
