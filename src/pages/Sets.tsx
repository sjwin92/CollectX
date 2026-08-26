
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
import { Plus, Star, Download, Layers, ChevronLeft, ChevronRight } from "lucide-react";
import { useCollection } from "@/hooks/useCollection";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { fixImageUrl, getSetImageFallbacks } from "@/services/api/cardImageService";


const SETS_PER_PAGE = 20;

const Sets = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [imageErrors, setImageErrors] = useState<Record<string, { logo: number; symbol: number }>>({});
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();
  const { collection } = useCollection();

  // Owned card-ids per set, for the completion ring on each SetCard.
  const ownedBySet = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const card of collection) {
      const sid = card.set?.id;
      if (!sid) continue;
      if (!m.has(sid)) m.set(sid, new Set());
      m.get(sid)!.add(card.id);
    }
    return m;
  }, [collection]);
  const hasCollection = collection.length > 0;

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
      
      <main className="relative container flex-1 pb-16 pt-24">
        <div className="aura pointer-events-none absolute inset-x-0 top-8 mx-auto h-[360px] max-w-5xl" aria-hidden />
        <div className="anim-rise relative mb-8">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-primary">
            <Layers className="h-3.5 w-3.5" />
            Browse sets
          </div>
          <h1 className="font-display text-4xl font-extrabold leading-[1.02] md:text-[46px]">Every Pokémon TCG set</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            From the latest Scarlet &amp; Violet expansions back to Base Set. Track your completion and jump into any set's cards.
          </p>
          <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Plus className="h-4 w-4 text-primary" />
              <span>Hover a set and hit <span className="font-semibold text-foreground">+</span> to quick-add its cards.</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={handleImportAllSets}
              disabled={isImporting}
            >
              <Download className="mr-2 h-4 w-4" />
              {isImporting ? "Importing…" : "Import all sets"}
            </Button>
          </div>
        </div>

        {/* Featured Sets Section */}
        {!isLoading && !isError && featuredSets.length > 0 && (
          <section className="anim-rise mb-12" style={{ animationDelay: '80ms' }}>
            <div className="mb-4 flex items-center gap-2">
              <Star className="h-5 w-5 fill-gold text-gold" />
              <h2 className="font-display text-xl font-extrabold">Latest sets</h2>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {featuredSets.map((set, i) => {
                const logoUrl = getImageUrl(set.id, 'logo', set.images?.logo);
                return (
                  <Link key={set.id} to={`/pokemon-sets/${set.id}`} className="block h-full">
                    <article
                      className="anim-rise group relative flex h-full flex-col overflow-hidden rounded-2xl border border-gold/30 bg-card shadow-[0_26px_54px_-24px_rgba(0,0,0,0.8)] hover-lift"
                      style={{ animationDelay: `${120 + i * 70}ms` }}
                    >
                      <div className="relative flex h-[118px] items-center justify-center overflow-hidden bg-[radial-gradient(340px_130px_at_50%_124%,hsl(var(--gold)/0.16),transparent_70%)]">
                        {logoUrl ? (
                          <OptimizedImage
                            src={logoUrl}
                            alt={`${set.name} logo`}
                            className="max-h-14 max-w-[80%] object-contain"
                            lazy
                            fallbackSrc="/placeholder.svg"
                          />
                        ) : (
                          <h3 className="px-4 text-center font-display text-lg font-extrabold">{set.name}</h3>
                        )}
                        <span className="holo" aria-hidden />
                      </div>
                      <div className="flex flex-1 flex-col p-4">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className="h-3.5 w-3.5 rounded-[4px] border border-border bg-secondary" />
                          {set.series}
                        </div>
                        <div className="mt-2.5 flex items-center justify-between">
                          <span className="font-display text-sm font-extrabold tabular-nums">{set.printedTotal} cards</span>
                          <span className="rounded-full bg-gold/12 px-2 py-[3px] text-[10px] font-semibold text-gold">
                            {set.releaseDate ? format(new Date(set.releaseDate), 'MMM yyyy') : '—'}
                          </span>
                        </div>
                      </div>
                    </article>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-extrabold">All sets</h2>
          {!isLoading && !isError && <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>}
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
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {pagedSets.map((set, i) => {
                const owned = ownedBySet.get(set.id)?.size ?? 0;
                const total = (set.printedTotal as number) || 0;
                const completionPct =
                  hasCollection && total > 0 ? Math.min(100, Math.round((owned / total) * 100)) : undefined;
                return (
                  <div
                    key={set.id}
                    className="anim-rise"
                    style={{ animationDelay: `${Math.min(i, 8) * 50 + 120}ms` }}
                  >
                    <SetCard set={set} storedImages={batchSetImages[set.id]} completionPct={completionPct} />
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex items-center justify-between">
              <Button
                variant="outline"
                className="rounded-full"
                onClick={loadPreviousPage}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="mr-1.5 h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground tabular-nums">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                className="rounded-full"
                onClick={loadNextPage}
                disabled={currentPage >= totalPages}
              >
                Next
                <ChevronRight className="ml-1.5 h-4 w-4" />
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
