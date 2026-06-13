import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, TrendingUp, DollarSign, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FreeSealedProduct } from "@/services/freeSealedProductsService";

interface EbayListing {
  title: string;
  price: string;
  url: string;
  condition: string;
  shipping: string;
  location: string;
  imageUrl?: string;
}

interface EbaySealedProductsIntegrationProps {
  product: FreeSealedProduct;
}

const EbaySealedProductsIntegration: React.FC<EbaySealedProductsIntegrationProps> = ({ product }) => {
  const [ebayListings, setEbayListings] = useState<EbayListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [averagePrice, setAveragePrice] = useState<number | null>(null);
  const { toast } = useToast();

  const fetchEbayListings = async () => {
    setLoading(true);
    setError(null);

    try {
      // Skip the call entirely if the user isn't signed in — the edge
      // function requires auth and would just 401.
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Sign in to view live eBay market data for this product.");
        return;
      }

      const { data, error } = await supabase.functions.invoke('ebay-integration', {
        body: {
          action: 'search',
          query: `${product.name} ${product.setName} sealed`,
          itemType: 'sealed_product'
        }
      });

      if (error) throw error;

      setEbayListings(data?.listings || []);
      setAveragePrice(data?.averagePrice || null);
    } catch (err: any) {
      console.error('Error fetching eBay listings:', err);
      const msg = err?.message?.includes('401') || err?.message?.toLowerCase?.().includes('unauthorized')
        ? "Sign in to view live eBay market data for this product."
        : (err?.message || 'Failed to fetch eBay listings');
      setError(msg);
      // Don't toast — error is shown inline in the card.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEbayListings();
  }, [product.id]);


  const handleListOnEbay = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('ebay-integration', {
        body: {
          action: 'create_listing',
          item: {
            name: product.name,
            setName: product.setName,
            type: product.type,
            price: product.price.current,
            imageUrl: product.imageUrl,
            releaseDate: product.releaseDate,
            availability: product.availability
          },
          itemType: 'sealed_product'
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Listing created on eBay successfully!",
      });
    } catch (error: any) {
      console.error('Error creating eBay listing:', error);
      toast({
        title: "Error", 
        description: error.message || "Failed to create eBay listing",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            <CardTitle className="text-lg">eBay Market Data</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            <CardTitle className="text-lg">eBay Market Data</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchEbayListings} variant="outline" className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">eBay Market Data</CardTitle>
          </div>
          <Button onClick={handleListOnEbay} size="sm">
            List on eBay
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {averagePrice && (
          <div className="flex items-center gap-4 mb-4 p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="font-medium">Average eBay Price:</span>
              <span className="text-lg font-bold text-green-600">£{averagePrice.toFixed(2)}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Based on {ebayListings.length} recent listings
            </div>
          </div>
        )}

        {ebayListings.length > 0 ? (
          <div className="space-y-3">
            <h4 className="font-medium mb-3">Recent eBay Listings</h4>
            {ebayListings.slice(0, 5).map((listing, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex-1">
                  <div className="font-medium text-sm leading-tight mb-1">
                    {listing.title}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-xs px-1 py-0">
                      {listing.condition}
                    </Badge>
                    <span>{listing.location}</span>
                    {listing.shipping && <span>+ {listing.shipping} shipping</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-bold text-green-600">{listing.price}</div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    asChild
                  >
                    <a 
                      href={listing.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View
                    </a>
                  </Button>
                </div>
              </div>
            ))}
            {ebayListings.length > 5 && (
              <div className="text-center text-sm text-muted-foreground">
                + {ebayListings.length - 5} more listings available
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No recent eBay listings found for this product</p>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <Button onClick={fetchEbayListings} variant="outline" size="sm">
            Refresh Data
          </Button>
          <Button
            variant="outline"
            size="sm"
            asChild
          >
            <a 
              href={`https://www.ebay.co.uk/sch/i.html?_nkw=${encodeURIComponent(`${product.name} ${product.setName} sealed`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              Search eBay
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default EbaySealedProductsIntegration;