
import React, { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ProductCard from "@/components/pokemon/ProductCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Star, Filter } from "lucide-react";
import { getProductTypeLabel } from "@/types/cardTypes";

// Mock product data - in a real app this would come from an API
const products = [
  // Elite Trainer Boxes
  {
    id: "sv10-etb",
    name: "Glory of Team Rocket Elite Trainer Box",
    series: "Scarlet & Violet",
    setId: "sv10",
    productType: "etb" as const,
    packCount: 9,
    releaseDate: "2025-05-24",
    msrp: 49.99,
    description: "Contains 9 booster packs, energy cards, card sleeves, and more from the Glory of Team Rocket expansion."
  },
  {
    id: "sv9-etb",
    name: "Surging Sparks Elite Trainer Box",
    series: "Scarlet & Violet",
    setId: "sv9",
    productType: "etb" as const,
    packCount: 9,
    releaseDate: "2024-11-08",
    msrp: 49.99,
    description: "Contains 9 booster packs plus premium accessories from the Surging Sparks set."
  },
  // Booster Boxes
  {
    id: "sv10-bb",
    name: "Glory of Team Rocket Booster Box",
    series: "Scarlet & Violet",
    setId: "sv10",
    productType: "box" as const,
    packCount: 36,
    releaseDate: "2025-05-24",
    msrp: 143.99,
    description: "Contains 36 booster packs from the Glory of Team Rocket expansion."
  },
  {
    id: "sv9-bb",
    name: "Surging Sparks Booster Box",
    series: "Scarlet & Violet",
    setId: "sv9",
    productType: "box" as const,
    packCount: 36,
    releaseDate: "2024-11-08",
    msrp: 143.99,
    description: "Contains 36 booster packs from the Surging Sparks set."
  },
  // Blister Packs
  {
    id: "sv10-blister-3",
    name: "Glory of Team Rocket 3-Pack Blister",
    series: "Scarlet & Violet",
    setId: "sv10",
    productType: "blister-pack" as const,
    packCount: 3,
    releaseDate: "2025-05-24",
    msrp: 14.99,
    description: "Contains 3 booster packs with promo card from Glory of Team Rocket."
  },
  {
    id: "sv9-blister-1",
    name: "Surging Sparks Single Pack Blister",
    series: "Scarlet & Violet",
    setId: "sv9",
    productType: "blister-pack" as const,
    packCount: 1,
    releaseDate: "2024-11-08",
    msrp: 4.99,
    description: "Single booster pack blister from Surging Sparks."
  },
  // Tins
  {
    id: "sv10-tin-charizard",
    name: "Charizard ex Tin - Glory of Team Rocket",
    series: "Scarlet & Violet",
    setId: "sv10",
    productType: "tin" as const,
    packCount: 4,
    releaseDate: "2025-05-24",
    msrp: 24.99,
    description: "Collector tin featuring Charizard ex with 4 booster packs and promo cards."
  },
  {
    id: "sv9-tin-pikachu",
    name: "Pikachu ex Tin - Surging Sparks",
    series: "Scarlet & Violet",
    setId: "sv9",
    productType: "tin" as const,
    packCount: 4,
    releaseDate: "2024-11-08",
    msrp: 24.99,
    description: "Special Pikachu ex collector tin with 4 booster packs."
  },
  // Theme Decks
  {
    id: "sv10-deck-rocket",
    name: "Team Rocket's Meowth Battle Deck",
    series: "Scarlet & Violet",
    setId: "sv10",
    productType: "deck" as const,
    releaseDate: "2025-05-24",
    msrp: 19.99,
    description: "Ready-to-play 60-card deck featuring Team Rocket's Meowth."
  },
  {
    id: "sv9-deck-lightning",
    name: "Lightning Storm Battle Deck",
    series: "Scarlet & Violet",
    setId: "sv9",
    productType: "deck" as const,
    releaseDate: "2024-11-08",
    msrp: 19.99,
    description: "Electric-type themed battle deck with powerful Lightning Pokémon."
  }
];

const Products = () => {
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Get unique product types for filtering
  const productTypes = Array.from(new Set(products.map(p => p.productType)));
  
  // Filter products based on selected filter
  const filteredProducts = selectedFilter === "all" 
    ? products 
    : products.filter(p => p.productType === selectedFilter);
  
  // Paginate filtered products
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  
  // Featured products (first 4)
  const featuredProducts = products.slice(0, 4);

  const loadNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
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
                setCurrentPage(1);
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
                    setCurrentPage(1);
                  }}
                >
                  {getProductTypeLabel(type)} ({count})
                </Badge>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {currentProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-8">
            <Button
              variant="outline"
              onClick={loadPreviousPage}
              disabled={currentPage <= 1}
            >
              Previous Page
            </Button>
            <span className="text-muted-foreground">
              Page {currentPage} of {totalPages} • {filteredProducts.length} products
            </span>
            <Button
              variant="outline"
              onClick={loadNextPage}
              disabled={currentPage >= totalPages}
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
