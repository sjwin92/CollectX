import React, { useState, useEffect } from "react";
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
  Filter,
  X
} from "lucide-react";
import GlassCard from "@/components/ui/custom/GlassCard";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { fetchCardsByName } from "@/services/tcgdexApi";
import GradedFilter from "@/components/profile/GradedFilter";
import { Checkbox } from "@/components/ui/checkbox";
import { ExtendedCardItemProps } from "@/types/cardTypes";

const initialCollection = [
  {
    id: "base1-4",
    name: "Charizard",
    imageUrl: "https://assets.tcgdex.net/en/base/base1/4",
    rarity: "Rare Holo",
    condition: "Near Mint",
    estimatedValue: "$350-450",
    graded: true,
    gradingCompany: "PSA",
    grade: "9"
  },
  {
    id: "swsh4-25",
    name: "Pikachu VMAX",
    imageUrl: "https://assets.tcgdex.net/en/swsh/swsh4/25",
    rarity: "Rare",
    condition: "Mint",
    estimatedValue: "$120-150",
    graded: false
  },
  {
    id: "sm10-158",
    name: "Mewtwo & Mew GX",
    imageUrl: "https://assets.tcgdex.net/en/sm/sm10/158",
    rarity: "Ultra Rare",
    condition: "Excellent",
    estimatedValue: "$200-250",
    graded: true,
    gradingCompany: "BGS",
    grade: "9.5"
  },
  {
    id: "base1-2",
    name: "Blastoise",
    imageUrl: "https://assets.tcgdex.net/en/base/base1/2",
    rarity: "Rare Holo",
    condition: "Good",
    estimatedValue: "$80-120",
    graded: false
  },
  {
    id: "base1-15",
    name: "Venusaur",
    imageUrl: "https://assets.tcgdex.net/en/base/base1/15",
    rarity: "Rare Holo",
    condition: "Played",
    estimatedValue: "$150-180",
    graded: true,
    gradingCompany: "CGC",
    grade: "8"
  },
  {
    id: "sm12-226",
    name: "Mew V",
    imageUrl: "https://assets.tcgdex.net/en/sm/sm12/226",
    rarity: "Ultra Rare",
    condition: "Near Mint",
    estimatedValue: "$40-60",
    graded: false
  }
];

const initialWishlistCards = [
  {
    id: "sm8-159",
    name: "Lugia GX",
    imageUrl: "https://assets.tcgdex.net/en/sm/sm8/159",
    rarity: "Ultra Rare",
    condition: "Any",
    estimatedValue: "$180-250"
  },
  {
    id: "sm7-68",
    name: "Rayquaza GX",
    imageUrl: "https://assets.tcgdex.net/en/sm/sm7/68",
    rarity: "Ultra Rare",
    condition: "Near Mint or better",
    estimatedValue: "$90-120"
  }
];

const Collection = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [myCollection, setMyCollection] = useState(initialCollection);
  const [wishlistCards, setWishlistCards] = useState(initialWishlistCards);
  const [tradableCards, setTradableCards] = useState(initialCollection.slice(0, 4));
  const [sortOption, setSortOption] = useState("name-asc");
  const [filterRarity, setFilterRarity] = useState("all");
  const [filterCondition, setFilterCondition] = useState("all");
  const [showGradedOnly, setShowGradedOnly] = useState(false);
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchCardQuery, setSearchCardQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState("all");
  
  const [newCardCondition, setNewCardCondition] = useState("Mint");
  const [newCardEstValue, setNewCardEstValue] = useState("");
  const [selectedCard, setSelectedCard] = useState(null);
  const [isToWishlist, setIsToWishlist] = useState(false);
  const [isTradable, setIsTradable] = useState(false);
  const [isGraded, setIsGraded] = useState(false);
  const [gradingCompany, setGradingCompany] = useState("PSA");
  const [gradeValue, setGradeValue] = useState("9");

  const calculateTotalValue = () => {
    let total = 0;
    myCollection.forEach(card => {
      const value = card.estimatedValue;
      if (value) {
        const match = value.match(/\$(\d+)-(\d+)/);
        if (match) {
          const min = parseInt(match[1]);
          const max = parseInt(match[2]);
          total += (min + max) / 2;
        }
      }
    });
    return Math.round(total);
  };

  const getFilteredAndSortedCards = (cards) => {
    if (!cards) return [];
    
    let filtered = cards;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(card => 
        card.name.toLowerCase().includes(query) || 
        card.rarity.toLowerCase().includes(query) ||
        card.condition.toLowerCase().includes(query)
      );
    }
    
    if (filterRarity !== "all") {
      filtered = filtered.filter(card => 
        card.rarity.toLowerCase().includes(filterRarity.toLowerCase())
      );
    }
    
    if (filterCondition !== "all") {
      filtered = filtered.filter(card => 
        card.condition.toLowerCase().includes(filterCondition.toLowerCase())
      );
    }
    
    if (showGradedOnly) {
      filtered = filtered.filter(card => card.graded === true);
    }
    
    return [...filtered].sort((a, b) => {
      switch (sortOption) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "rarity-asc":
          return a.rarity.localeCompare(b.rarity);
        case "rarity-desc":
          return b.rarity.localeCompare(a.rarity);
        case "value-asc":
          return extractValue(a.estimatedValue) - extractValue(b.estimatedValue);
        case "value-desc":
          return extractValue(b.estimatedValue) - extractValue(a.estimatedValue);
        default:
          return 0;
      }
    });
  };

  const extractValue = (priceString) => {
    if (!priceString) return 0;
    const match = priceString.match(/\$(\d+)-(\d+)/);
    if (match) {
      const min = parseInt(match[1]);
      const max = parseInt(match[2]);
      return (min + max) / 2;
    }
    return 0;
  };

  const getFilteredCardsByTab = () => {
    switch (selectedTab) {
      case "all":
        return getFilteredAndSortedCards(myCollection);
      case "tradable":
        return getFilteredAndSortedCards(tradableCards);
      case "wishlist":
        return getFilteredAndSortedCards(wishlistCards);
      default:
        return [];
    }
  };

  const handleCardSearch = async () => {
    if (!searchCardQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    setSearchLoading(true);
    try {
      const cards = await fetchCardsByName(searchCardQuery);
      setSearchResults(cards.slice(0, 10));
    } catch (error) {
      console.error("Error searching for cards:", error);
      toast({
        title: "Search Error",
        description: "Failed to search for cards. Please try again.",
        variant: "destructive"
      });
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAddCard = () => {
    if (!selectedCard) {
      toast({
        title: "No Card Selected",
        description: "Please select a card first",
        variant: "destructive"
      });
      return;
    }
    
    if (!newCardEstValue && !isToWishlist) {
      toast({
        title: "Missing Information",
        description: "Please enter an estimated value",
        variant: "destructive"
      });
      return;
    }
    
    const newCard = {
      id: selectedCard.id,
      name: selectedCard.name,
      imageUrl: selectedCard.image,
      rarity: selectedCard.rarity || "Unknown",
      condition: isToWishlist ? "Any" : newCardCondition,
      estimatedValue: isToWishlist ? "Varies" : `$${newCardEstValue}`,
      graded: isGraded,
      ...(isGraded && {
        gradingCompany: gradingCompany,
        grade: gradeValue
      })
    };
    
    if (isToWishlist) {
      setWishlistCards([...wishlistCards, newCard]);
      toast({
        title: "Added to Wishlist",
        description: `${selectedCard.name} has been added to your wishlist.`
      });
    } else {
      const updatedCollection = [...myCollection, newCard];
      setMyCollection(updatedCollection);
      
      if (isTradable) {
        setTradableCards([...tradableCards, newCard]);
      }
      
      toast({
        title: "Added to Collection",
        description: `${selectedCard.name} has been added to your collection.`
      });
    }
    
    setSelectedCard(null);
    setSearchCardQuery("");
    setSearchResults([]);
    setNewCardCondition("Mint");
    setNewCardEstValue("");
    setIsToWishlist(false);
    setIsTradable(false);
    setIsGraded(false);
    setGradingCompany("PSA");
    setGradeValue("9");
    setIsAddCardOpen(false);
  };

  const handleTabChange = (value) => {
    setSelectedTab(value);
  };

  const handleQuickAddCard = () => {
    setIsToWishlist(false);
    setIsAddCardOpen(true);
  };

  const handleQuickAddWishlist = () => {
    setIsToWishlist(true);
    setIsAddCardOpen(true);
  };

  const handleQuickBrowseCards = () => {
    window.location.href = "/pokemon-cards";
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 pt-24 pb-16">
        <div className="container">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">My Collection</h1>
            <p className="text-muted-foreground">Manage and organize your Pokémon card collection</p>
          </div>
          
          <Tabs defaultValue="all" value={selectedTab} onValueChange={handleTabChange} className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <TabsList>
                <TabsTrigger value="all">All Cards</TabsTrigger>
                <TabsTrigger value="tradable">Tradable</TabsTrigger>
                <TabsTrigger value="wishlist">Wishlist</TabsTrigger>
              </TabsList>
              
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={sortOption} onValueChange={setSortOption}>
                  <SelectTrigger className="w-auto">
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                    <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                    <SelectItem value="rarity-asc">Rarity (Low-High)</SelectItem>
                    <SelectItem value="rarity-desc">Rarity (High-Low)</SelectItem>
                    <SelectItem value="value-asc">Value (Low-High)</SelectItem>
                    <SelectItem value="value-desc">Value (High-Low)</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={filterRarity} onValueChange={setFilterRarity}>
                  <SelectTrigger className="w-auto">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Rarity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Rarities</SelectItem>
                    <SelectItem value="common">Common</SelectItem>
                    <SelectItem value="uncommon">Uncommon</SelectItem>
                    <SelectItem value="rare">Rare</SelectItem>
                    <SelectItem value="ultra">Ultra Rare</SelectItem>
                    <SelectItem value="holo">Holo</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={filterCondition} onValueChange={setFilterCondition}>
                  <SelectTrigger className="w-auto">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Conditions</SelectItem>
                    <SelectItem value="mint">Mint</SelectItem>
                    <SelectItem value="near mint">Near Mint</SelectItem>
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="played">Played</SelectItem>
                  </SelectContent>
                </Select>
                
                <GradedFilter 
                  showGradedOnly={showGradedOnly}
                  onGradedFilterChange={setShowGradedOnly}
                />
                
                <Dialog open={isAddCardOpen} onOpenChange={setIsAddCardOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="h-9">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Card
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>{isToWishlist ? "Add to Wishlist" : "Add to Collection"}</DialogTitle>
                      <DialogDescription>
                        Search for a card and add it to your {isToWishlist ? "wishlist" : "collection"}
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input 
                          placeholder="Search for a card by name..." 
                          className="pl-9"
                          value={searchCardQuery}
                          onChange={(e) => setSearchCardQuery(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleCardSearch()}
                        />
                        <Button 
                          variant="secondary" 
                          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7"
                          onClick={handleCardSearch}
                          disabled={searchLoading}
                        >
                          {searchLoading ? "Searching..." : "Search"}
                        </Button>
                      </div>
                      
                      {searchResults.length > 0 && (
                        <div className="max-h-40 overflow-y-auto border rounded-md">
                          {searchResults.map((card) => (
                            <div 
                              key={card.id} 
                              className={`flex items-center gap-3 p-2 hover:bg-muted cursor-pointer ${selectedCard?.id === card.id ? 'bg-muted' : ''}`}
                              onClick={() => setSelectedCard(card)}
                            >
                              <img 
                                src={card.image} 
                                alt={card.name} 
                                className="h-10 w-8 object-cover rounded"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://archives.bulbagarden.net/media/upload/1/17/Cardback.jpg';
                                }}
                              />
                              <div>
                                <div className="font-medium text-sm">{card.name}</div>
                                <div className="text-xs text-muted-foreground">{card.set?.name || 'Unknown set'}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {selectedCard && (
                        <Card className="p-4">
                          <div className="flex gap-4">
                            <img 
                              src={selectedCard.image} 
                              alt={selectedCard.name} 
                              className="h-24 w-auto object-contain rounded"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://archives.bulbagarden.net/media/upload/1/17/Cardback.jpg';
                              }}
                            />
                            <div className="flex-1">
                              <h3 className="font-bold">{selectedCard.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {selectedCard.set?.name || 'Unknown set'} • {selectedCard.rarity || 'Unknown rarity'}
                              </p>
                              
                              {!isToWishlist && (
                                <>
                                  <div className="mt-2 grid grid-cols-2 gap-2">
                                    <Select value={newCardCondition} onValueChange={setNewCardCondition}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Condition" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Mint">Mint</SelectItem>
                                        <SelectItem value="Near Mint">Near Mint</SelectItem>
                                        <SelectItem value="Excellent">Excellent</SelectItem>
                                        <SelectItem value="Good">Good</SelectItem>
                                        <SelectItem value="Played">Played</SelectItem>
                                        <SelectItem value="Poor">Poor</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    
                                    <div className="relative">
                                      <span className="absolute left-2 top-1/2 transform -translate-y-1/2">$</span>
                                      <Input 
                                        placeholder="Est. Value"
                                        className="pl-6"
                                        value={newCardEstValue}
                                        onChange={(e) => {
                                          const value = e.target.value.replace(/[^0-9-]/g, '');
                                          setNewCardEstValue(value);
                                        }}
                                      />
                                    </div>
                                  </div>
                                  
                                  <div className="mt-2 space-y-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <Checkbox 
                                        id="tradable"
                                        checked={isTradable}
                                        onCheckedChange={(checked) => setIsTradable(!!checked)}
                                      />
                                      <span className="text-sm">Mark as tradable</span>
                                    </label>
                                    
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <Checkbox 
                                        id="graded"
                                        checked={isGraded}
                                        onCheckedChange={(checked) => setIsGraded(!!checked)}
                                      />
                                      <span className="text-sm">This card is graded</span>
                                    </label>
                                    
                                    {isGraded && (
                                      <div className="grid grid-cols-2 gap-2 mt-2 pl-6">
                                        <Select value={gradingCompany} onValueChange={setGradingCompany}>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Grading Company" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="PSA">PSA</SelectItem>
                                            <SelectItem value="BGS">BGS</SelectItem>
                                            <SelectItem value="CGC">CGC</SelectItem>
                                            <SelectItem value="SGC">SGC</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        
                                        <Select value={gradeValue} onValueChange={setGradeValue}>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Grade" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="10">10 (Gem Mint)</SelectItem>
                                            <SelectItem value="9.5">9.5</SelectItem>
                                            <SelectItem value="9">9</SelectItem>
                                            <SelectItem value="8.5">8.5</SelectItem>
                                            <SelectItem value="8">8</SelectItem>
                                            <SelectItem value="7">7</SelectItem>
                                            <SelectItem value="6">6</SelectItem>
                                            <SelectItem value="5">5</SelectItem>
                                            <SelectItem value="4">4 or below</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    )}
                                  </div>
                                </>
                              )}
                              
                              <Button 
                                className="mt-4" 
                                onClick={handleAddCard}
                              >
                                Add to {isToWishlist ? "Wishlist" : "Collection"}
                              </Button>
                            </div>
                          </div>
                        </Card>
                      )}
                      
                      {searchResults.length === 0 && searchCardQuery && !searchLoading && (
                        <div className="text-center py-3 text-muted-foreground">
                          No cards found matching "{searchCardQuery}"
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
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
              {searchQuery && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            <TabsContent value="all" className="mt-0">
              <CardGrid 
                cards={getFilteredCardsByTab()} 
                columns={{ sm: 2, md: 3, lg: 4, xl: 5 }}
              />
              
              {myCollection.length === 0 && (
                <GlassCard className="p-8 text-center">
                  <h3 className="text-xl font-medium mb-2">Your collection is empty</h3>
                  <p className="text-muted-foreground mb-4">
                    Start adding cards to your collection to keep track of what you have
                  </p>
                  <Button onClick={handleQuickAddCard}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Card
                  </Button>
                </GlassCard>
              )}
              
              {myCollection.length > 0 && getFilteredCardsByTab().length === 0 && (
                <GlassCard className="p-8 text-center">
                  <h3 className="text-xl font-medium mb-2">No cards match your search</h3>
                  <p className="text-muted-foreground mb-4">
                    Try adjusting your search terms or filters
                  </p>
                  <Button variant="outline" onClick={() => {
                    setSearchQuery("");
                    setFilterRarity("all");
                    setFilterCondition("all");
                  }}>
                    Clear Filters
                  </Button>
                </GlassCard>
              )}
            </TabsContent>
            
            <TabsContent value="tradable" className="mt-0">
              <CardGrid 
                cards={getFilteredCardsByTab()} 
                columns={{ sm: 2, md: 3, lg: 4, xl: 5 }}
              />
              
              {tradableCards.length === 0 && (
                <GlassCard className="p-8 text-center">
                  <h3 className="text-xl font-medium mb-2">No tradable cards</h3>
                  <p className="text-muted-foreground mb-4">
                    Mark cards as tradable to show other collectors what's available
                  </p>
                  <Button onClick={handleQuickAddCard}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Tradable Card
                  </Button>
                </GlassCard>
              )}
              
              {tradableCards.length > 0 && getFilteredCardsByTab().length === 0 && (
                <GlassCard className="p-8 text-center">
                  <h3 className="text-xl font-medium mb-2">No tradable cards match your search</h3>
                  <p className="text-muted-foreground mb-4">
                    Try adjusting your search terms or filters
                  </p>
                  <Button variant="outline" onClick={() => {
                    setSearchQuery("");
                    setFilterRarity("all");
                    setFilterCondition("all");
                  }}>
                    Clear Filters
                  </Button>
                </GlassCard>
              )}
            </TabsContent>
            
            <TabsContent value="wishlist" className="mt-0">
              <CardGrid 
                cards={getFilteredCardsByTab()} 
                columns={{ sm: 2, md: 3, lg: 4, xl: 5 }}
              />
              
              {wishlistCards.length === 0 && (
                <GlassCard className="p-8 text-center">
                  <h3 className="text-xl font-medium mb-2">Your wishlist is empty</h3>
                  <p className="text-muted-foreground mb-4">
                    Add cards to your wishlist to show others what you're looking for
                  </p>
                  <Button onClick={handleQuickAddWishlist}>Add to Wishlist</Button>
                </GlassCard>
              )}
              
              {wishlistCards.length > 0 && getFilteredCardsByTab().length === 0 && (
                <GlassCard className="p-8 text-center">
                  <h3 className="text-xl font-medium mb-2">No wishlist cards match your search</h3>
                  <p className="text-muted-foreground mb-4">
                    Try adjusting your search terms or filters
                  </p>
                  <Button variant="outline" onClick={() => {
                    setSearchQuery("");
                    setFilterRarity("all");
                    setFilterCondition("all");
                  }}>
                    Clear Filters
                  </Button>
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
                  <div className="text-2xl font-bold">${calculateTotalValue()}</div>
                  <div className="text-sm text-muted-foreground">Est. Value</div>
                </div>
              </div>
            </GlassCard>
            
            <GlassCard className="p-6">
              <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start" onClick={handleQuickAddCard}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Card
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={handleQuickAddWishlist}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add to Wishlist
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={handleQuickBrowseCards}>
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
