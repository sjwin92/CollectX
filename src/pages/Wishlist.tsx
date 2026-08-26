import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Trash2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getMyWishlist, removeFromWishlist, type WishlistItem } from "@/services/wishlistService";
import CardTypeBadge from "@/components/pokemon/CardTypeBadge";
import CardPrice from "@/components/pokemon/CardPrice";
import { useCardTypeMeta } from "@/hooks/useCardTypeMeta";
import { useCardPrices } from "@/hooks/useCardPrices";

const Wishlist: React.FC = () => {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const cardIds = items.map((i) => i.card_id);
  const typeMeta = useCardTypeMeta(cardIds);
  const prices = useCardPrices(cardIds);

  useEffect(() => {
    getMyWishlist().then(setItems).finally(() => setIsLoading(false));
  }, []);

  const handleRemove = async (cardId: string) => {
    try {
      await removeFromWishlist(cardId);
      setItems((prev) => prev.filter((i) => i.card_id !== cardId));
    } catch (error) {
      toast({
        title: "Couldn't remove item",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container max-w-3xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Heart className="h-6 w-6 text-primary" /> My Want List
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                We'll notify you the moment someone lists one of these cards.
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link to="/pokemon-cards"><Search className="mr-2 h-4 w-4" /> Browse cards</Link>
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            </div>
          ) : items.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center space-y-3">
                <p className="text-muted-foreground">Your want list is empty.</p>
                <Button asChild>
                  <Link to="/pokemon-cards"><Search className="mr-2 h-4 w-4" /> Find cards to add</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <Link to={`/card/${item.card_id}`} className="w-14 h-20 rounded bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.card_name} className="w-full h-full object-cover" />
                      ) : (
                        <Heart className="h-5 w-5 text-muted-foreground" />
                      )}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link to={`/card/${item.card_id}`} className="font-medium truncate hover:underline block">
                        {item.card_name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{item.set_name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <CardTypeBadge meta={typeMeta.get(item.card_id) ?? null} />
                        <CardPrice priceGbp={prices.get(item.card_id) ?? null} label />
                        {item.max_price != null && (
                          <span className="flex flex-col leading-none">
                            <span className="text-[9px] uppercase tracking-wider text-muted-foreground/70">Your cap</span>
                            <span className="text-sm font-semibold tabular-nums">£{Number(item.max_price).toFixed(2)}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleRemove(item.card_id)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Wishlist;
