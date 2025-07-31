
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSets } from "@/services/pokemonSetsApi";
import { supabasePokemonService } from "@/services/supabasePokemonService";
import { pokemonDataImporter } from "@/services/pokemonDataImporter";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import SetCard from "@/components/pokemon/SetCard";
import OptimizedImage from "@/components/ui/OptimizedImage";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Plus, Star, ImageOff, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import FeaturedBadge from "@/components/marketplace/listing/FeaturedBadge";
import { fixImageUrl, getSetImageFallbacks } from "@/services/api/cardImageService";


const Sets = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [imageErrors, setImageErrors] = useState<Record<string, { logo: number; symbol: number }>>({});
  const { toast } = useToast();
  
  // First try to get sets from our database
  const { data: localSets, isLoading: localLoading } = useQuery({
    queryKey: ['localPokemonSets'],
    queryFn: () => supabasePokemonService.getAllSets(),
    staleTime: 10 * 60 * 1000, // Consider local data fresh for 10 minutes
  });

  // Fallback to external API with pagination
  const { data: apiData, isLoading: apiLoading, isError, error } = useQuery({
    queryKey: ['pokemonSets', currentPage],
    queryFn: () => getSets(currentPage, 20),
    enabled: !localSets || localSets.length === 0, // Only fetch if no local data
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 3
  });

  const isLoading = localLoading || apiLoading;
  
  // Properly handle the different data structures
  const data = React.useMemo(() => {
    if (localSets && localSets.length > 0) {
      // Local data is an array, wrap it in the expected structure
      return { data: localSets, totalCount: localSets.length };
    }
    return apiData; // API data already has the correct structure
  }, [localSets, apiData]);

  // Handle errors with toast
  React.useEffect(() => {
    if (isError && error) {
      console.error("Query error:", error);
      toast({
        title: "Error loading sets",
        description: error.message,
        variant: "destructive"
      });
    }
  }, [isError, error, toast]);

  // Debug logging
  React.useEffect(() => {
    console.log("Sets page state:", { 
      isLoading, 
      isError, 
      dataLength: data?.data?.length,
      currentPage,
      error: error?.message 
    });
  }, [isLoading, isError, data, currentPage, error]);

  // Use combined data with proper structure handling
  const combinedData = React.useMemo(() => {
    console.log("Computing combinedData:", { isLoading, isError, hasData: !!data, dataLength: data?.data?.length });
    if (isLoading || isError || !data?.data) return [];
    
    // Convert database format to API format if needed
    return data.data.map(set => ({
      ...set,
      // Ensure the set has the expected API structure
      images: set.images || { logo: set.logo_url, symbol: set.symbol_url },
      printedTotal: set.printed_total || set.printedTotal,
      releaseDate: set.release_date || set.releaseDate
    }));
  }, [data, isLoading, isError]);

  // Get featured sets (first 4 sets with enhanced SV image loading)
  const featuredSets = combinedData.slice(0, 4) || [];
  
  // Get remaining sets for main grid (excluding featured ones)
  const remainingSets = combinedData.slice(4) || [];

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

  const handleImportAllSets = async () => {
    try {
      toast({
        title: "Starting import",
        description: "Importing all Pokemon sets and images to database...",
      });
      
      await pokemonDataImporter.importAllSets();
      
      toast({
        title: "Import completed",
        description: "All Pokemon sets have been imported successfully!",
        variant: "default"
      });
      
      // Refresh the page data
      window.location.reload();
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import failed",
        description: "Failed to import Pokemon sets. Please try again.",
        variant: "destructive"
      });
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Plus className="h-4 w-4 text-primary" />
                <span className="font-medium">Tip:</span>
                <span>Hover over any set and click the + button to quickly add cards to your collection.</span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleImportAllSets}
                disabled={pokemonDataImporter.isImportInProgress}
              >
                <Download className="h-4 w-4 mr-2" />
                {pokemonDataImporter.isImportInProgress ? 'Importing...' : 'Import All Sets'}
              </Button>
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
                // Get stored images for this set
                const logoUrl = getImageUrl(set.id, 'logo', set.images?.logo);
                const symbolUrl = getImageUrl(set.id, 'symbol', set.images?.symbol);
                
                console.log(`Featured set ${set.id}: logo=${logoUrl}, symbol=${symbolUrl}`);
                
                return (
                  <Link key={set.id} to={`/pokemon-sets/${set.id}`} className="block h-full">
                    <Card className="overflow-hidden h-full transition-all hover:shadow-lg hover:border-primary/50 relative group border-amber-400/50 shadow">
                      <div className="absolute top-0 left-0 right-0">
                        <FeaturedBadge />
                      </div>
                      <CardHeader className="pt-10">
                        {logoUrl ? (
                          <div className="flex justify-center mb-2">
                            <OptimizedImage 
                              src={logoUrl} 
                              alt={`${set.name} logo`}
                              className="h-16 object-contain mx-auto"
                              lazy={true}
                              fallbackSrc="/placeholder.svg"
                              onError={() => console.log(`Failed to load logo for ${set.id}: ${logoUrl}`)}
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
                              <OptimizedImage 
                                src={symbolUrl} 
                                alt={`${set.name} symbol`}
                                className="h-6 w-6 object-contain"
                                lazy={true}
                                fallbackSrc="/placeholder.svg"
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
              {remainingSets.map(set => (
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
