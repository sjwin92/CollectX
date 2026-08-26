
import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabasePokemonService } from "@/services/supabasePokemonService";
import { supabase } from "@/integrations/supabase/client";
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


const SETS_PER_PAGE = 20;

const Sets = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [imageErrors, setImageErrors] = useState<Record<string, { logo: number; symbol: number }>>({});
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  // Read sets from the local mirror (pokemon_sets). If the mirror is empty or
  // tiny, kick off the import-sets edge function once, then re-read.
  const { data: localSets, isLoading, isError, error } = useQuery({
    queryKey: ['sets-list'],
    queryFn: async () => {
      let sets = await supabasePokemonService.getAllSets();
      if (!sets || sets.length < 10) {
        await supabase.functions.invoke('import-sets', { body: {} });
        sets = await supabasePokemonService.getAllSets();
      }
      return sets;
    },
    staleTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });

  React.useEffect(() => {
    if (isError && error) {
      console.error("Sets query error:", error);
      toast({
        title: "Error loading sets",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  }, [isError, error, toast]);

  const combinedData = React.useMemo(() => {
    if (!localSets) return [] as any[];
    const processed = localSets
      // Drop Trainer Gallery / Galarian Gallery sub-sets — they share a
      // parent set's name and release date, so they read as duplicates in
      // the browse grid. Their cards still resolve via the set-detail page.
      .filter((set: any) => !/\b(?:Trainer|Galarian) Gallery$/i.test(set.name || ''))
      .map((set: any) => ({
        ...set,
        images: set.images || { logo: set.logo_url, symbol: set.symbol_url },
        printedTotal: set.printed_total ?? set.printedTotal,
        releaseDate: set.release_date ?? set.releaseDate,
      }));
    // Newest → oldest by release date
    return processed.sort((a: any, b: any) => {
      const dateA = new Date(a.releaseDate || '1900-01-01');
      const dateB = new Date(b.releaseDate || '1900-01-01');
      return dateB.getTime() - dateA.getTime();
    });
  }, [localSets]);

  // Featured = the 4 most recently released sets (newest first)
  const featuredSets = React.useMemo(
    () => combinedData.slice(0, 4),
    [combinedData]
  );

  // Remaining sets for main grid (newest → oldest), excluding the featured ones
  const remainingSets = React.useMemo(() => {
    const featuredIds = new Set(featuredSets.map(s => s.id));
    return combinedData.filter(s => !featuredIds.has(s.id));
  }, [combinedData, featuredSets]);

  const totalPages = Math.max(1, Math.ceil(remainingSets.length / SETS_PER_PAGE));

  // Clamp the page if the underlying set list shrinks (e.g. after a refetch)
  React.useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const pagedSets = React.useMemo(
    () => remainingSets.slice((currentPage - 1) * SETS_PER_PAGE, currentPage * SETS_PER_PAGE),
    [remainingSets, currentPage]
  );

  // Batch-fetch stored images for the sets visible on this page in a single query
  const allVisibleSetIds = useMemo(
    () => pagedSets.map(s => s.id),
    [pagedSets]
  );
  const { data: batchSetImages = {} } = useQuery({
    queryKey: ['batchSetImages', allVisibleSetIds],
    queryFn: () => supabasePokemonService.getBatchSetImages(allVisibleSetIds),
    enabled: allVisibleSetIds.length > 0,
    staleTime: 30 * 60 * 1000,
  });

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
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const loadPreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Warm the local mirror by invoking the import edge function for every
  // currently-loaded set. Each call is gated by the 24h freshness check on
  // the server so this is safe to run repeatedly.
  const handleImportAllSets = async () => {
    if (isImporting) return;
    setIsImporting(true);
    try {
      toast({
        title: "Starting import",
        description: `Caching ${combinedData.length} sets locally — this runs in the background.`,
      });

      let imported = 0;
      let skipped = 0;
      let failed = 0;

      // Run with a small concurrency limit so we don't hammer the edge runtime.
      const ids = combinedData.map((s) => s.id);
      const concurrency = 3;
      for (let i = 0; i < ids.length; i += concurrency) {
        const slice = ids.slice(i, i + concurrency);
        const results = await Promise.allSettled(
          slice.map((setId) =>
            supabase.functions.invoke("import-set-cards", { body: { setId } }),
          ),
        );
        for (const r of results) {
          if (r.status === "rejected") failed++;
          else if ((r.value as any)?.data?.skipped) skipped++;
          else imported++;
        }
      }

      toast({
        title: "Import complete",
        description: `Imported ${imported}, skipped ${skipped} (already fresh), failed ${failed}.`,
      });
    } catch (error) {
      console.error("Import error:", error);
      toast({
        title: "Import failed",
        description: "Failed to import Pokemon sets. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
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
                disabled={isImporting}
              >
                <Download className="h-4 w-4 mr-2" />
                {isImporting ? "Importing..." : "Import All Sets"}
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
              {pagedSets.map(set => (
                <SetCard key={set.id} set={set} storedImages={batchSetImages[set.id]} />
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
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={loadNextPage}
                disabled={currentPage >= totalPages}
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
