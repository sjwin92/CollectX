import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchFreeSealedProducts, FreeSealedProduct } from "@/services/freeSealedProductsService";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Search, Filter, Package, Star, Calendar, DollarSign, Key, ExternalLink, ShoppingCart } from "lucide-react";
import { format } from "date-fns";

// Product types for filtering
const productTypes = [
  { value: "all", label: "All Products" },
  { value: "Booster Box", label: "Booster Boxes" },
  { value: "Elite Trainer Box", label: "Elite Trainer Boxes" },
  { value: "Collection Box", label: "Collection Boxes" },
  { value: "Tin", label: "Tins" },
  { value: "Blister Pack", label: "Blister Packs" },
];

const SealedProducts = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const { toast } = useToast();

  const { data: products, isLoading, isError, refetch } = useQuery({
    queryKey: ['freeSealedProducts'],
    queryFn: fetchFreeSealedProducts,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 3
  });

  // Filter and sort products
  const filteredProducts = React.useMemo(() => {
    if (!products) return [];
    
    let filtered = products.filter((product: FreeSealedProduct) => {
      const matchesSearch = searchQuery === "" || 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.setName.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = selectedType === "all" || product.type === selectedType;
      
      return matchesSearch && matchesType;
    });

    // Sort products
    filtered.sort((a: FreeSealedProduct, b: FreeSealedProduct) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "price-low":
          return a.price.current - b.price.current;
        case "price-high":
          return b.price.current - a.price.current;
        case "release-date":
          return new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [products, searchQuery, selectedType, sortBy]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="container py-8 flex-1">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Sealed Products</h1>
              <p className="text-muted-foreground">
                Pokemon TCG sealed products with estimated pricing and product details.
              </p>
            </div>
          </div>
          
          {/* Search and Filter Controls */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sealed products..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full md:w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Product Type" />
              </SelectTrigger>
              <SelectContent>
                {productTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name A-Z</SelectItem>
                <SelectItem value="price-low">Price Low-High</SelectItem>
                <SelectItem value="price-high">Price High-Low</SelectItem>
                <SelectItem value="release-date">Newest First</SelectItem>
              </SelectContent>
            </Select>
            
            <Button onClick={() => refetch()} variant="outline">
              Refresh Data
            </Button>
          </div>
          
          {/* Results count */}
          <div className="flex items-center justify-between mb-6">
             <p className="text-sm text-muted-foreground">
               Showing {filteredProducts.length} sealed products
             </p>
             <div className="flex items-center gap-2 text-sm text-muted-foreground">
               <Package className="h-4 w-4" />
               <span>Product catalog</span>
             </div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-pulse text-xl">Loading sealed products...</div>
            <p className="text-muted-foreground mt-2">Fetching product data...</p>
          </div>
        ) : isError ? (
          <div className="text-center py-12">
            <Alert className="max-w-md mx-auto">
              <AlertDescription>
                Failed to load sealed products. Please try refreshing the page.
              </AlertDescription>
            </Alert>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No products found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product: FreeSealedProduct) => (
              <Card key={product.id} className="overflow-hidden h-full transition-all hover:shadow-lg hover:border-primary/50 group">
                <CardHeader className="pb-3">
                  <div className="aspect-square bg-muted rounded-lg mb-3 overflow-hidden">
                    <img 
                      src={product.imageUrl} 
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/placeholder.svg';
                      }}
                    />
                  </div>
                  <CardTitle className="text-base leading-tight">{product.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{product.setName}</p>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge variant="secondary" className="text-xs">
                      {product.type}
                    </Badge>
                    <Badge 
                      variant={product.availability === 'in-stock' ? 'default' : 
                               product.availability === 'pre-order' ? 'secondary' : 'destructive'} 
                      className="text-xs"
                    >
                      {product.availability.replace('-', ' ')}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Current Price:</span>
                      <span className="font-bold text-lg text-green-600">
                        £{product.price.current}
                      </span>
                    </div>
                    
                    {product.retailPrice && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">MSRP:</span>
                        <span className="text-sm line-through text-muted-foreground">
                          £{product.retailPrice}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{format(new Date(product.releaseDate), 'MMM d, yyyy')}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <ExternalLink className="h-3 w-3" />
                      <span>Source: {product.price.source}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <Button className="flex-1" variant="outline" size="sm">
                      <Star className="h-4 w-4 mr-2" />
                      Wishlist
                    </Button>
                    <Button className="flex-1" size="sm">
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Buy
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default SealedProducts;