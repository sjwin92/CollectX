
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getProducts, getFeaturedProducts } from "@/services/api/pokemonProductsService";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ProductCard from "@/components/pokemon/ProductCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Star, Filter } from "lucide-react";
import { getProductTypeLabel } from "@/types/cardTypes";
import { useToast } from "@/hooks/use-toast";

const Products = () => {
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();
  const itemsPerPage = 12;

  // Fetch products with React Query
  const { data: products = [], isLoading, isError } = useQuery({
    queryKey: ['products', currentPage, itemsPerPage],
    queryFn: () => getProducts(currentPage, itemsPerPage),
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

  // Fetch featured products
  const { data: featuredProducts = [] } = useQuery({
    queryKey: ['featuredProducts'],
    queryFn: getFeaturedProducts,
    meta: {
      onError: (error: Error) => {
        console.error('Error loading featured products:', error);
      }
    }
  });

  // Get unique product types for filtering
  const productTypes = Array.from(new Set(products.map(p => p.productType)));
  
  // Filter products based on selected filter
  const filteredProducts = selectedFilter === "all" 
    ? products 
    : products.filter(p => p.productType === selectedFilter);

  const loadNextPage = () => {
    setCurrentPage(prev => prev + 1);
  };

  const loadPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="container py-8 flex-1">
          <div className="text-center py-12">
            <div className="animate-pulse text-xl">Loading products...</div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="container py-8 flex-1">
          <div className="text-center py-12 text-destructive">
            Failed to load products. Please try again.
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Pokémon Products</h1>
          <p className="text-muted-foreground mb-4">
            Browse all types of Pokémon TCG products including booster boxes, Elite Trainer Boxes, tins, blister packs, and more.
          </p>
          <div className="bg-muted/50 p-4 rounded-lg border border-border mb-6">
            <div className="flex items-center gap-2 text-sm">
              <Package className="h-4 w-4 text-primary" />
              <span className="font-medium">Tip:</span>
              <span>Hover over any product and click the + button to quickly add it to your collection.</span>
            </div>
          </div>
        </div>

        {/* Featured Products Section */}
        {featuredProducts.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold mb-2 flex items-center">
                  <Star className="h-5 w-5 text-amber-400 mr-2 fill-amber-400" />
                  Featured Products
                </h2>
                <p className="text-muted-foreground">
                  Latest and most popular Pokémon TCG products
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}

        {/* Filter Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">All Products</h2>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filter by type:</span>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-6">
            <Badge 
              variant={selectedFilter === "all" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => {
                setSelectedFilter("all");
              }}
            >
              All Products ({products.length})
            </Badge>
            {productTypes.map(type => {
              const count = products.filter(p => p.productType === type).length;
              return (
                <Badge 
                  key={type}
                  variant={selectedFilter === type ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => {
                    setSelectedFilter(type);
                  }}
                >
                  {getProductTypeLabel(type)} ({count})
                </Badge>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {products.length > 0 && (
          <div className="flex justify-between items-center mt-8">
            <Button
              variant="outline"
              onClick={loadPreviousPage}
              disabled={currentPage <= 1}
            >
              Previous Page
            </Button>
            <span className="text-muted-foreground">
              Page {currentPage} • {filteredProducts.length} products
            </span>
            <Button
              variant="outline"
              onClick={loadNextPage}
              disabled={products.length < itemsPerPage}
            >
              Next Page
            </Button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Products;
