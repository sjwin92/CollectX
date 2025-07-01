
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { getProducts, getFeaturedProducts } from "@/services/api/pokemonProductsService";
import { getSetById } from "@/services/api/pokemonSetsService";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ProductCard from "@/components/pokemon/ProductCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Star, Filter, ArrowLeft } from "lucide-react";
import { getProductTypeLabel } from "@/types/cardTypes";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const Products = () => {
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const itemsPerPage = 12;

  // Get setId from URL params if filtering by set
  const setIdFilter = searchParams.get('setId');

  // Fetch set details if filtering by set
  const { data: setData } = useQuery({
    queryKey: ['pokemonSet', setIdFilter],
    queryFn: () => setIdFilter ? getSetById(setIdFilter) : null,
    enabled: !!setIdFilter,
  });

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

  // Fetch featured products (only if not filtering by set)
  const { data: featuredProducts = [] } = useQuery({
    queryKey: ['featuredProducts'],
    queryFn: getFeaturedProducts,
    enabled: !setIdFilter,
    meta: {
      onError: (error: Error) => {
        console.error('Error loading featured products:', error);
      }
    }
  });

  // Filter products by set if setId is provided
  const filteredBySet = setIdFilter 
    ? products.filter(p => p.setId === setIdFilter)
    : products;

  // Get unique product types for filtering
  const productTypes = Array.from(new Set(filteredBySet.map(p => p.productType)));
  
  // Filter products based on selected filter
  const filteredProducts = selectedFilter === "all" 
    ? filteredBySet 
    : filteredBySet.filter(p => p.productType === selectedFilter);

  const loadNextPage = () => {
    setCurrentPage(prev => prev + 1);
  };

  const loadPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleBackToSets = () => {
    navigate('/pokemon-sets');
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
        {setIdFilter && (
          <Button variant="ghost" onClick={handleBackToSets} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Sets
          </Button>
        )}

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {setIdFilter && setData ? `${setData.name} Products` : 'Pokémon Products'}
          </h1>
          <p className="text-muted-foreground mb-4">
            {setIdFilter && setData 
              ? `Browse all product types available for ${setData.name}`
              : 'Browse all types of Pokémon TCG products including booster boxes, Elite Trainer Boxes, tins, blister packs, and more.'
            }
          </p>
          <div className="bg-muted/50 p-4 rounded-lg border border-border mb-6">
            <div className="flex items-center gap-2 text-sm">
              <Package className="h-4 w-4 text-primary" />
              <span className="font-medium">Tip:</span>
              <span>Hover over any product and click the + button to quickly add it to your collection.</span>
            </div>
          </div>
        </div>

        {/* Featured Products Section - only show if not filtering by set */}
        {!setIdFilter && featuredProducts.length > 0 && (
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
            <h2 className="text-2xl font-bold">
              {setIdFilter ? 'Set Products' : 'All Products'}
            </h2>
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
              All Products ({filteredBySet.length})
            </Badge>
            {productTypes.map(type => {
              const count = filteredBySet.filter(p => p.productType === type).length;
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

        {filteredProducts.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No products found</h3>
            <p className="text-muted-foreground">
              {setIdFilter 
                ? `No products available for ${setData?.name || 'this set'} yet.`
                : 'No products match your current filters.'
              }
            </p>
          </div>
        )}

        {filteredBySet.length > 0 && (
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
