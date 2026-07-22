
import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getSetById } from "@/services/api/pokemonSetsService";
import { supabasePokemonService } from "@/services/supabasePokemonService";
import { getProductsForSet } from "@/services/api/pokemonProductsService";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ProductCard from "@/components/pokemon/ProductCard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Calendar, Trophy, Bookmark, Check, ImageOff, Package } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { SmartImage } from "@/components/common/SmartImage";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { fixImageUrl } from "@/services/api/cardImageService";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/hooks/useUser";

const SetDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [logoLoaded, setLogoLoaded] = React.useState(true);
  const [symbolLoaded, setSymbolLoaded] = React.useState(true);
  const { isSignedIn } = useUser();

  // Fire local set + stored images in parallel — both only need `id`
  const { data: localSet } = useQuery({
    queryKey: ['localPokemonSet', id],
    queryFn: () => id ? supabasePokemonService.getSetById(id) : null,
    enabled: !!id,
  });

  const { data: storedImages } = useQuery({
    queryKey: ['setImages', id],
    queryFn: () => id ? supabasePokemonService.getSetImages(id) : null,
    enabled: !!id,
    staleTime: 30 * 60 * 1000,
  });

  // Only hit the external API if Supabase has no record for this set
  const { data: apiSet, isLoading: apiLoading, isError } = useQuery({
    queryKey: ['pokemonSet', id],
    queryFn: () => id ? getSetById(id) : null,
    enabled: !!id && localSet === null,
  });

  const isLoading = apiLoading && !localSet;

  // Normalise whichever source resolved first
  const set = React.useMemo(() => {
    if (localSet) {
      return {
        ...localSet,
        images: localSet.images || { logo: (localSet as any).logo_url, symbol: (localSet as any).symbol_url },
        printedTotal: (localSet as any).printed_total || (localSet as any).printedTotal,
        releaseDate: (localSet as any).release_date || (localSet as any).releaseDate,
        legalities: localSet.legalities || {}
      };
    }
    return apiSet;
  }, [localSet, apiSet]);

  // Derive products from the set already in memory — no extra API call
  const { data: setProducts = [] } = useQuery({
    queryKey: ['setProducts', id],
    queryFn: () => getProductsForSet(set as any),
    enabled: !!set,
    staleTime: 60 * 60 * 1000,
  });

  // eBay image enrichment — fires as soon as set name is available, parallel to products
  const { data: ebayImageMap = {} } = useQuery({
    queryKey: ['ebayProductImages', set?.name],
    queryFn: async () => {
      const { data } = await (supabase as any).functions.invoke('ebay-integration', {
        body: { action: 'search', query: `pokemon ${set!.name}`, itemType: 'sealed_product', limit: 10 }
      });
      const imageMap: Record<string, string> = {};
      for (const listing of (data?.listings || [])) {
        if (!listing.imageUrl) continue;
        const title = (listing.title || '').toLowerCase();
        if (!imageMap['etb'] && (title.includes('elite trainer') || title.includes('etb'))) imageMap['etb'] = listing.imageUrl;
        if (!imageMap['box'] && title.includes('booster box')) imageMap['box'] = listing.imageUrl;
        if (!imageMap['tin'] && title.includes('tin')) imageMap['tin'] = listing.imageUrl;
        if (!imageMap['blister-pack'] && title.includes('blister')) imageMap['blister-pack'] = listing.imageUrl;
        if (!imageMap['deck'] && title.includes('deck')) imageMap['deck'] = listing.imageUrl;
        if (!imageMap['booster-pack'] && title.includes('booster pack') && !title.includes('box')) imageMap['booster-pack'] = listing.imageUrl;
      }
      return imageMap;
    },
    enabled: !!set?.name && isSignedIn,
    staleTime: 30 * 60 * 1000,
  });

  const enrichedProducts = React.useMemo(() => {
    const list = Array.isArray(setProducts) ? setProducts : [];
    return list.map((p: any) => ({ ...p, imageUrl: ebayImageMap[p.productType] || p.imageUrl }));
  }, [setProducts, ebayImageMap]);


  // Process image URLs — storedImages already loaded in parallel above
  const logoUrl = React.useMemo(() => {
    if (storedImages?.logo) return storedImages.logo;
    return set ? fixImageUrl(set.images?.logo, set.id, 'logo') : undefined;
  }, [set, storedImages]);

  const symbolUrl = React.useMemo(() => {
    if (storedImages?.symbol) return storedImages.symbol;
    return set ? fixImageUrl(set.images?.symbol, set.id, 'symbol') : undefined;
  }, [set, storedImages]);

  const handleBack = () => {
    navigate('/pokemon-sets');
  };

  const handleViewCards = () => {
    if (id) {
      navigate(`/pokemon-cards?setId=${encodeURIComponent(id)}`);
      toast({
        title: "Loading cards",
        description: `Loading cards from ${set?.name || 'set'}...`
      });
    }
  };

  if (isLoading && !localSet) {
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
            {logoUrl && logoLoaded ? (
              <div className="bg-card border rounded-lg p-4 flex items-center justify-center">
                <SmartImage
                  src={logoUrl}
                  alt={`${set.name} logo`}
                  className="max-w-full max-h-40 object-contain"
                  onError={() => setLogoLoaded(false)}
                />
              </div>
            ) : (
              <div className="bg-card border rounded-lg p-4">
                <h2 className="text-2xl font-bold text-center">{set.name}</h2>
                {!logoLoaded && logoUrl && (
                  <div className="flex justify-center mt-2">
                    <ImageOff className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            )}
            
            {symbolUrl && symbolLoaded ? (
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <SmartImage
                    src={symbolUrl}
                    alt={`${set.name} symbol`}
                    className="w-10 h-10 object-contain"
                    onError={() => setSymbolLoaded(false)}
                  />
                  <div>
                    <h3 className="font-medium">Set Symbol</h3>
                    <p className="text-sm text-muted-foreground">Official symbol used on cards</p>
                  </div>
                </CardContent>
              </Card>
            ) : symbolLoaded === false && (
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 flex items-center justify-center text-muted-foreground">
                    <ImageOff className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-medium">Set Symbol</h3>
                    <p className="text-sm text-muted-foreground">Image not available</p>
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

        {/* Products Section */}
        {enrichedProducts.length > 0 && (
          <section className="mt-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold mb-2 flex items-center">
                  <Package className="h-5 w-5 text-primary mr-2" />
                  Available Products
                </h2>
                <p className="text-muted-foreground">
                  All product types available for {set.name}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {enrichedProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}
      </main>
      
      <Footer />
    </div>
  );
};

export default SetDetail;
