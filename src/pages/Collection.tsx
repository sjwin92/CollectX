
import React, { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CardGrid from "@/components/cards/CardGrid";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Search, 
  SlidersHorizontal,
  Filter
} from "lucide-react";
import GlassCard from "@/components/ui/custom/GlassCard";

// Placeholder data
const myCollection = [
  {
    id: "1",
    name: "Charizard GX Rainbow Rare",
    imageUrl: "https://images.unsplash.com/photo-1605979257913-1704eb7b6246?q=80&w=1470&auto=format&fit=crop",
    rarity: "Ultra Rare",
    condition: "Near Mint",
    estimatedValue: "$350-450"
  },
  {
    id: "2",
    name: "Pikachu V-Max",
    imageUrl: "https://images.unsplash.com/photo-1607736703050-d0666c1d1278?q=80&w=1470&auto=format&fit=crop",
    rarity: "Rare",
    condition: "Mint",
    estimatedValue: "$120-150"
  },
  {
    id: "3",
    name: "Mewtwo EX",
    imageUrl: "https://images.unsplash.com/photo-1613771404721-1f92d799e49f?q=80&w=1469&auto=format&fit=crop",
    rarity: "Ultra Rare",
    condition: "Excellent",
    estimatedValue: "$200-250"
  },
  {
    id: "4",
    name: "Blastoise Holo",
    imageUrl: "https://images.unsplash.com/photo-1638075528746-8b5f9c2b6c9c?q=80&w=1480&auto=format&fit=crop",
    rarity: "Rare Holo",
    condition: "Good",
    estimatedValue: "$80-120"
  },
  {
    id: "5",
    name: "Venusaur Base Set",
    imageUrl: "https://images.unsplash.com/photo-1606041011872-596597976b25?q=80&w=1374&auto=format&fit=crop",
    rarity: "Rare Holo",
    condition: "Played",
    estimatedValue: "$150-180"
  },
  {
    id: "6",
    name: "Mew V",
    imageUrl: "https://images.unsplash.com/photo-1553481187-be93c21490a9?q=80&w=1470&auto=format&fit=crop",
    rarity: "Ultra Rare",
    condition: "Near Mint",
    estimatedValue: "$40-60"
  }
];

const tradableCards = myCollection.slice(0, 4);
const wishlistCards = [
  {
    id: "7",
    name: "Lugia GX",
    imageUrl: "https://images.unsplash.com/photo-1627856013091-fed6e4e30025?q=80&w=1470&auto=format&fit=crop",
    rarity: "Ultra Rare",
    condition: "Any",
    estimatedValue: "$180-250"
  },
  {
    id: "8",
    name: "Rayquaza GX",
    imageUrl: "https://images.unsplash.com/photo-1688840169355-f48c2bc28e8a?q=80&w=1287&auto=format&fit=crop",
    rarity: "Ultra Rare",
    condition: "Near Mint or better",
    estimatedValue: "$90-120"
  }
];

const Collection = () => {
  const [searchQuery, setSearchQuery] = useState("");
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 pt-24 pb-16">
        <div className="container">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">My Collection</h1>
            <p className="text-muted-foreground">Manage and organize your Pokémon card collection</p>
          </div>
          
          <Tabs defaultValue="all" className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <TabsList>
                <TabsTrigger value="all">All Cards</TabsTrigger>
                <TabsTrigger value="tradable">Tradable</TabsTrigger>
                <TabsTrigger value="wishlist">Wishlist</TabsTrigger>
              </TabsList>
              
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-9">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Sort
                </Button>
                <Button variant="outline" size="sm" className="h-9">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
                <Button size="sm" className="h-9">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Card
                </Button>
              </div>
            </div>
            
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input 
                placeholder="Search by card name, set, or type..." 
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <TabsContent value="all" className="mt-0">
              <CardGrid 
                cards={myCollection} 
                columns={{ sm: 2, md: 3, lg: 4, xl: 5 }}
              />
              
              {myCollection.length === 0 && (
                <GlassCard className="p-8 text-center">
                  <h3 className="text-xl font-medium mb-2">Your collection is empty</h3>
                  <p className="text-muted-foreground mb-4">
                    Start adding cards to your collection to keep track of what you have
                  </p>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Card
                  </Button>
                </GlassCard>
              )}
            </TabsContent>
            
            <TabsContent value="tradable" className="mt-0">
              <CardGrid 
                cards={tradableCards} 
                columns={{ sm: 2, md: 3, lg: 4, xl: 5 }}
              />
              
              {tradableCards.length === 0 && (
                <GlassCard className="p-8 text-center">
                  <h3 className="text-xl font-medium mb-2">No tradable cards</h3>
                  <p className="text-muted-foreground mb-4">
                    Mark cards as tradable to show other collectors what's available
                  </p>
                  <Button>Mark Cards as Tradable</Button>
                </GlassCard>
              )}
            </TabsContent>
            
            <TabsContent value="wishlist" className="mt-0">
              <CardGrid 
                cards={wishlistCards} 
                columns={{ sm: 2, md: 3, lg: 4, xl: 5 }}
              />
              
              {wishlistCards.length === 0 && (
                <GlassCard className="p-8 text-center">
                  <h3 className="text-xl font-medium mb-2">Your wishlist is empty</h3>
                  <p className="text-muted-foreground mb-4">
                    Add cards to your wishlist to show others what you're looking for
                  </p>
                  <Button>Add to Wishlist</Button>
                </GlassCard>
              )}
            </TabsContent>
          </Tabs>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <GlassCard className="col-span-1 md:col-span-2 p-6">
              <h2 className="text-xl font-bold mb-4">Collection Stats</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-primary/5 rounded-lg">
                  <div className="text-2xl font-bold">{myCollection.length}</div>
                  <div className="text-sm text-muted-foreground">Total Cards</div>
                </div>
                <div className="p-4 bg-primary/5 rounded-lg">
                  <div className="text-2xl font-bold">{tradableCards.length}</div>
                  <div className="text-sm text-muted-foreground">Tradable</div>
                </div>
                <div className="p-4 bg-primary/5 rounded-lg">
                  <div className="text-2xl font-bold">{wishlistCards.length}</div>
                  <div className="text-sm text-muted-foreground">Wishlist</div>
                </div>
                <div className="p-4 bg-primary/5 rounded-lg">
                  <div className="text-2xl font-bold">$1,140</div>
                  <div className="text-sm text-muted-foreground">Est. Value</div>
                </div>
              </div>
            </GlassCard>
            
            <GlassCard className="p-6">
              <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Card
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="h-4 w-4 mr-2" />
                  Add to Wishlist
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Search className="h-4 w-4 mr-2" />
                  Browse Cards
                </Button>
              </div>
            </GlassCard>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Collection;
