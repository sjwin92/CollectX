
import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getSetById } from "@/services/api/pokemonSetsService";
import { supabasePokemonService } from "@/services/supabasePokemonService";
import { getSealedProductsForSet, toProductCard } from "@/services/api/sealedProductsService";
import SetChecklistTile from "@/components/pokemon/collection/SetChecklistTile";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ProductCard from "@/components/pokemon/ProductCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package, Layers3, Heart, Grid2x2 } from "lucide-react";
import { format } from "date-fns";
import { SmartImage } from "@/components/common/SmartImage";
import { Skeleton } from "@/components/ui/skeleton";
import { fixImageUrl } from "@/services/api/cardImageService";
import { useCollection } from "@/hooks/useCollection";

const SetDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [logoLoaded, setLogoLoaded] = React.useState(true);
  const [symbolLoaded, setSymbolLoaded] = React.useState(true);

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

  // Real sealed products (Booster Box, ETB, Bundle, Tins…) with TCGplayer
  // images + market prices, from the sealed_products mirror.
  const { data: sealedProducts = [] } = useQuery({
    queryKey: ['sealedProducts', id],
    queryFn: () => getSealedProductsForSet(id!),
    enabled: !!id,
    staleTime: 60 * 60 * 1000,
  });


  // Process image URLs — storedImages already loaded in parallel above
  const logoUrl = React.useMemo(() => {
    if (storedImages?.logo) return storedImages.logo;
    return set ? fixImageUrl(set.images?.logo, set.id, 'logo') : undefined;
  }, [set, storedImages]);

  const symbolUrl = React.useMemo(() => {
    if (storedImages?.symbol) return storedImages.symbol;
    return set ? fixImageUrl(set.images?.symbol, set.id, 'symbol') : undefined;
  }, [set, storedImages]);

  const { collection, loadCollectionFromStorage } = useCollection();
  /** cardId -> { dbId, quantity } for cards from this set already in the collection. */
  const ownedBySet = React.useMemo(() => {
    const m = new Map<string, { dbId: string; quantity: number }>();
    if (!set?.id || !Array.isArray(collection)) return m;
    for (const c of collection) {
      if (c.set?.id !== set.id) continue;
      const dbId = (c as { dbId?: string }).dbId;
      if (!dbId) continue;
      const prev = m.get(c.id);
      m.set(c.id, { dbId, quantity: (prev?.quantity ?? 0) + (c.quantity ?? 1) });
    }
    return m;
  }, [collection, set?.id]);
  const ownedIds = React.useMemo(() => new Set(ownedBySet.keys()), [ownedBySet]);
  const ownedInSet = ownedIds.size;
  const totalCards = Number((set as any)?.printedTotal) || 0;
  const stillNeeded = Math.max(0, totalCards - ownedInSet);
  const completionPct = totalCards > 0 ? Math.min(100, Math.round((ownedInSet / totalCards) * 100)) : 0;

  // Per-card checklist — read straight from the pokemon_cards mirror.
  const { data: checklistRows = [] } = useQuery({
    queryKey: ["set-checklist", id],
    enabled: !!id,
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pokemon_cards")
        .select("id, name, number, rarity, small_image_url, large_image_url")
        .eq("set_id", id!)
        .order("number");
      if (error) throw error;
      return data ?? [];
    },
  });
  const setCards = React.useMemo(() => {
    const list = Array.isArray(checklistRows) ? checklistRows : [];
    return [...list]
      .map((r) => ({
        id: r.id as string,
        name: (r.name as string) ?? "Unknown Card",
        number: (r.number as string) ?? undefined,
        rarity: (r.rarity as string) ?? undefined,
        imageUrl: (r.small_image_url as string) ?? (r.large_image_url as string) ?? undefined,
        set: { id: id, name: set?.name },
      }))
      .sort((a, b) => {
        const na = parseInt(String(a.number ?? "").replace(/\D/g, ""), 10);
        const nb = parseInt(String(b.number ?? "").replace(/\D/g, ""), 10);
        if (Number.isNaN(na) || Number.isNaN(nb)) return String(a.number).localeCompare(String(b.number));
        return na - nb;
      });
  }, [checklistRows, id, set?.name]);

  const handleBack = () => {
    navigate('/pokemon-sets');
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
      
      <main className="relative container flex-1 pb-16 pt-24">
        <div className="aura pointer-events-none absolute inset-x-0 top-8 mx-auto h-[360px] max-w-5xl" aria-hidden />

        <button
          onClick={handleBack}
          className="anim-rise mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to sets
        </button>

        {/* Banner */}
        <div className="anim-rise relative overflow-hidden rounded-3xl border border-border bg-card shadow-[0_26px_54px_-24px_rgba(0,0,0,0.8)]">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(540px 240px at 14% -12%, hsl(var(--primary) / 0.18), transparent 65%), radial-gradient(480px 220px at 92% 128%, hsl(var(--gold) / 0.10), transparent 65%)",
            }}
          />
          <div className="relative flex flex-col items-center gap-7 p-6 sm:flex-row sm:p-8">
            <div className="flex h-32 w-full max-w-[240px] shrink-0 items-center justify-center rounded-2xl border border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent p-4">
              {logoUrl && logoLoaded ? (
                <SmartImage
                  src={logoUrl}
                  alt={`${set.name} logo`}
                  className="max-h-full max-w-full object-contain"
                  onError={() => setLogoLoaded(false)}
                />
              ) : (
                <span className="text-center font-display text-xl font-extrabold">{set.name}</span>
              )}
            </div>

            <div className="min-w-0 flex-1 text-center sm:text-left">
              <h1 className="font-display text-3xl font-extrabold leading-[1.03] sm:text-[36px]">{set.name}</h1>
              <div className="mt-2.5 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-[13px] text-muted-foreground sm:justify-start">
                <span>{set.series} series</span>
                <span aria-hidden>·</span>
                <span>Released {format(new Date(set.releaseDate), 'MMM d, yyyy')}</span>
                <span aria-hidden>·</span>
                <span>{totalCards} cards</span>
              </div>
              <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                {set.legalities?.standard === 'Legal' && (
                  <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">Standard legal</span>
                )}
                {set.legalities?.expanded === 'Legal' && (
                  <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">Expanded legal</span>
                )}
                <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">{set.id}</span>
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-center gap-2">
              <div className="relative h-[104px] w-[104px]">
                <svg width="104" height="104" className="-rotate-90">
                  <circle cx="52" cy="52" r="40" fill="none" stroke="hsl(var(--secondary))" strokeWidth="7" />
                  {completionPct > 0 && (
                    <circle
                      cx="52"
                      cy="52"
                      r="40"
                      fill="none"
                      stroke={completionPct >= 100 ? "hsl(var(--gold))" : "hsl(var(--primary))"}
                      strokeWidth="7"
                      strokeLinecap="round"
                      strokeDasharray={`${(completionPct / 100) * (2 * Math.PI * 40)} ${2 * Math.PI * 40}`}
                      style={
                        {
                          animation: "ring-draw 1.2s cubic-bezier(0.19,1,0.22,1) both",
                          "--ring-circumference": `${(completionPct / 100) * (2 * Math.PI * 40)}`,
                        } as React.CSSProperties
                      }
                    />
                  )}
                </svg>
                <span className="absolute inset-0 flex flex-col items-center justify-center">
                  <b className={`font-display text-xl font-extrabold ${completionPct >= 100 ? "text-gold" : "text-primary"}`}>{completionPct}%</b>
                  <span className="text-[10px] text-muted-foreground tabular-nums">{ownedInSet} / {totalCards || "?"}</span>
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground">Your completion</span>
            </div>
          </div>
        </div>

        {/* KPI strip */}
        <div className="anim-rise mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3" style={{ animationDelay: '120ms' }}>
          {[
            { k: "Owned", v: String(ownedInSet), icon: Layers3, gold: false },
            { k: "Still needed", v: String(stillNeeded), icon: Heart, gold: true },
            { k: "Total in set", v: String(totalCards), icon: Package, gold: false },
          ].map((s) => (
            <div key={s.k} className="hover-lift rounded-2xl border border-border bg-card p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                <s.icon className="h-3.5 w-3.5" />
                {s.k}
              </div>
              <div className={`mt-2 font-display text-2xl font-extrabold tabular-nums ${s.gold ? "text-gold" : ""}`}>{s.v}</div>
            </div>
          ))}
        </div>

        {/* About */}
        <div className="anim-rise mt-6 rounded-2xl border border-border bg-card p-6" style={{ animationDelay: '180ms' }}>
          <h2 className="font-display text-lg font-extrabold">About this set</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {set.name} is part of the {set.series} series and contains {totalCards} cards, released{" "}
            {format(new Date(set.releaseDate), 'MMMM d, yyyy')}.
          </p>
        </div>

        {/* Per-card checklist */}
        {setCards.length > 0 && (
          <section className="anim-rise mt-12" style={{ animationDelay: '240ms' }}>
            <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1">
              <div className="flex items-center gap-2">
                <Grid2x2 className="h-5 w-5 text-primary" />
                <h2 className="font-display text-xl font-extrabold">Set checklist</h2>
              </div>
              <span className="text-sm text-muted-foreground tabular-nums">
                {setCards.filter((c) => ownedIds.has(c.id)).length} / {setCards.length} owned
              </span>
            </div>

            <p className="mb-4 text-xs text-muted-foreground">
              Tap a card to open it · use − / + to add or remove it from your collection.
            </p>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
              {setCards.map((card) => {
                const owned = ownedBySet.get(card.id);
                return (
                  <SetChecklistTile
                    key={card.id}
                    card={card}
                    owned={!!owned}
                    quantity={owned?.quantity ?? 0}
                    dbId={owned?.dbId}
                    onChanged={loadCollectionFromStorage}
                  />
                );
              })}
            </div>
          </section>
        )}

        {/* Sealed products — real TCGplayer catalogue + market prices */}
        {sealedProducts.length > 0 && (
          <section className="anim-rise mt-12" style={{ animationDelay: '300ms' }}>
            <div className="mb-5 flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <h2 className="font-display text-xl font-extrabold">Sealed products</h2>
              <span className="text-xs text-muted-foreground">market prices via TCGplayer</span>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sealedProducts.map((p) => (
                <ProductCard
                  key={p.id}
                  product={{ ...toProductCard(p), productType: p.productType as never, series: set.name }}
                />
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
