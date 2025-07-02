import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getProducts } from "@/services/api/pokemonProductsService";
import { resolveProductImage } from "@/services/api/productImageService";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, Filter, Package, Star, Calendar, DollarSign } from "lucide-react";
import { format } from "date-fns";

// Sealed product types for filtering
const productTypes = [
  { value: "all", label: "All Products" },
  { value: "booster-box", label: "Booster Boxes" },
  { value: "elite-trainer-box", label: "Elite Trainer Boxes" },
  { value: "collection-box", label: "Collection Boxes" },
  { value: "theme-deck", label: "Theme Decks" },
  { value: "starter-deck", label: "Starter Decks" },
  { value: "tin", label: "Tins" },
  { value: "blister-pack", label: "Blister Packs" },
];

const SealedProducts = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();
  
  const { data, isLoading, isError } = useQuery({
    queryKey: ['sealedProducts', currentPage, selectedType],
    queryFn: () => getProducts(currentPage, 20),
    meta: {
      onError: (error: Error) => {
        toast({
          title: "Error loading products",
          description: error.message,
          variant: "destructive"
        });
      }
    }
  });

  // Filter and sort products based on search and filters
  const filteredProducts = React.useMemo(() => {
    if (!data) return [];
    
    let filtered = data.filter(product => {
      const matchesSearch = searchQuery === "" || 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.set?.name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = selectedType === "all" || 
        product.name.toLowerCase().includes(selectedType.replace("-", " "));
      
      return matchesSearch && matchesType;
    });

    // Sort products
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "release-date":
          return new Date(b.releaseDate || 0).getTime() - new Date(a.releaseDate || 0).getTime();
        case "price":
          return (b.cardmarket?.prices?.averageSellPrice || 0) - (a.cardmarket?.prices?.averageSellPrice || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [data, searchQuery, selectedType, sortBy]);

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
          <h1 className="text-3xl font-bold mb-2">Sealed Products</h1>
          <p className="text-muted-foreground mb-6">
            Discover booster boxes, Elite Trainer Boxes, collection sets, and other sealed Pokémon products.
          </p>
          
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
                <SelectItem value="release-date">Newest First</SelectItem>
                <SelectItem value="price">Price High-Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Results count */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-muted-foreground">
              Showing {filteredProducts.length} sealed products
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Package className="h-4 w-4" />
              <span>Premium sealed products</span>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-pulse text-xl">Loading sealed products...</div>
          </div>
        ) : isError ? (
          <div className="text-center py-12 text-destructive">
            Failed to load products. Please try again.
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
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map(product => (
                <Card key={product.id} className="overflow-hidden h-full transition-all hover:shadow-lg hover:border-primary/50 group">
                  <CardHeader className="pb-3">
                    <div className="aspect-square bg-muted rounded-lg mb-3 overflow-hidden">
                      {product.images?.large ? (
                        <img 
                          src={product.images.large} 
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <CardTitle className="text-base leading-tight">{product.name}</CardTitle>
                    {product.set?.name && (
                      <p className="text-sm text-muted-foreground">{product.set.name}</p>
                    )}
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {product.supertype && (
                        <Badge variant="secondary" className="text-xs">
                          {product.supertype}
                        </Badge>
                      )}
                      {product.legalities?.standard === 'Legal' && (
                        <Badge variant="default" className="text-xs">
                          Standard
                        </Badge>
                      )}
                    </div>
                    
                    <div className="space-y-2 text-sm text-muted-foreground">
                      {product.releaseDate && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          <span>{format(new Date(product.releaseDate), 'MMM d, yyyy')}</span>
                        </div>
                      )}
                      
                      {product.cardmarket?.prices?.averageSellPrice && (
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-3 w-3" />
                          <span className="font-medium text-foreground">
                            €{product.cardmarket.prices.averageSellPrice.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <Button className="w-full mt-4" variant="outline">
                      <Star className="h-4 w-4 mr-2" />
                      Add to Wishlist
                    </Button>
                  </CardContent>
                </Card>
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
                Page {currentPage} of {Math.ceil((data?.length || 0) / 20)}
              </span>
              <Button
                variant="outline"
                onClick={loadNextPage}
                disabled={!data || currentPage >= Math.ceil(data.length / 20)}
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

export default SealedProducts;