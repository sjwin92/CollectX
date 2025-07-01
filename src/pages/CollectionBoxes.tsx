import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Box, 
  Plus, 
  Search, 
  Star, 
  Shield, 
  TrendingUp, 
  Users, 
  Package,
  Edit,
  Trash2,
  ArrowRightLeft
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CollectionBox {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  cardCount: number;
  totalValue: number;
  cards: any[];
}

const CollectionBoxes = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [newBoxName, setNewBoxName] = useState("");
  const [selectedBox, setSelectedBox] = useState<CollectionBox | null>(null);

  // Mock collection boxes - in real app this would come from database
  const [collectionBoxes, setCollectionBoxes] = useState<CollectionBox[]>([
    {
      id: "tradeable",
      name: "Cards to Trade",
      description: "Available for trading with other collectors",
      icon: "ArrowRightLeft",
      color: "blue",
      cardCount: 47,
      totalValue: 1250.00,
      cards: []
    },
    {
      id: "untouchables",
      name: "Untouchables",
      description: "Never trading these precious cards",
      icon: "Shield",
      color: "red",
      cardCount: 12,
      totalValue: 3200.00,
      cards: []
    },
    {
      id: "high-value",
      name: "High Value",
      description: "Premium cards worth $100+",
      icon: "TrendingUp",
      color: "green",
      cardCount: 23,
      totalValue: 5600.00,
      cards: []
    },
    {
      id: "rare",
      name: "Rare Collection",
      description: "Hard to find and unique cards",
      icon: "Star",
      color: "purple",
      cardCount: 18,
      totalValue: 890.00,
      cards: []
    },
    {
      id: "trainers",
      name: "Trainer Cards",
      description: "All trainer and supporter cards",
      icon: "Users",
      color: "orange",
      cardCount: 156,
      totalValue: 420.00,
      cards: []
    },
    {
      id: "etbs",
      name: "ETB Collection",
      description: "Elite Trainer Box pulls and promos",
      icon: "Package",
      color: "indigo",
      cardCount: 84,
      totalValue: 750.00,
      cards: []
    }
  ]);

  const getIconComponent = (iconName: string) => {
    const icons: { [key: string]: React.ComponentType<any> } = {
      ArrowRightLeft,
      Shield,
      TrendingUp,
      Star,
      Users,
      Package
    };
    const IconComponent = icons[iconName] || Box;
    return <IconComponent className="h-5 w-5" />;
  };

  const getColorClasses = (color: string) => {
    const colorMap: { [key: string]: string } = {
      blue: "border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10",
      red: "border-red-500/20 bg-red-500/5 hover:bg-red-500/10",
      green: "border-green-500/20 bg-green-500/5 hover:bg-green-500/10",
      purple: "border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10",
      orange: "border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10",
      indigo: "border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10"
    };
    return colorMap[color] || colorMap.blue;
  };

  const createNewBox = () => {
    if (!newBoxName.trim()) {
      toast({
        title: "Box name required",
        description: "Please enter a name for your new collection box",
        variant: "destructive"
      });
      return;
    }

    const newBox: CollectionBox = {
      id: Date.now().toString(),
      name: newBoxName,
      description: "Custom collection box",
      icon: "Box",
      color: "blue",
      cardCount: 0,
      totalValue: 0,
      cards: []
    };

    setCollectionBoxes([...collectionBoxes, newBox]);
    setNewBoxName("");
    
    toast({
      title: "Box created",
      description: `${newBoxName} has been added to your collection`
    });
  };

  const filteredBoxes = collectionBoxes.filter(box =>
    box.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    box.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalCards = collectionBoxes.reduce((sum, box) => sum + box.cardCount, 0);
  const totalValue = collectionBoxes.reduce((sum, box) => sum + box.totalValue, 0);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 pt-24 pb-16">
        <div className="container">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Box className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Collection Boxes</h1>
            </div>
            <p className="text-muted-foreground">
              Organize your Pokémon cards into custom boxes for easy management and trading
            </p>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Cards</p>
                    <p className="text-2xl font-bold">{totalCards.toLocaleString()}</p>
                  </div>
                  <Box className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Collection Boxes</p>
                    <p className="text-2xl font-bold">{collectionBoxes.length}</p>
                  </div>
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Value</p>
                    <p className="text-2xl font-bold">${totalValue.toLocaleString()}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Actions */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search your collection boxes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Box
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Collection Box</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <Input
                    placeholder="Box name (e.g., 'Secret Rares', 'Tournament Deck')"
                    value={newBoxName}
                    onChange={(e) => setNewBoxName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && createNewBox()}
                  />
                  <Button onClick={createNewBox} className="w-full">
                    Create Box
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Collection Boxes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBoxes.map((box) => (
              <Card 
                key={box.id} 
                className={`cursor-pointer transition-all duration-200 ${getColorClasses(box.color)}`}
                onClick={() => setSelectedBox(box)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getIconComponent(box.icon)}
                      <CardTitle className="text-lg">{box.name}</CardTitle>
                    </div>
                    <Badge variant="secondary">{box.cardCount}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{box.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Value</p>
                      <p className="font-semibold">${box.totalValue.toLocaleString()}</p>
                    </div>
                    <Button variant="outline" size="sm">
                      Manage
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="mt-12 text-center">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="flex flex-wrap justify-center gap-4">
              <Button 
                variant="outline" 
                onClick={() => navigate('/pokemon-cards')}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Cards to Collection
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate('/trades')}
                className="flex items-center gap-2"
              >
                <ArrowRightLeft className="h-4 w-4" />
                Browse Trades
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Box Detail Modal */}
      {selectedBox && (
        <Dialog open={!!selectedBox} onOpenChange={() => setSelectedBox(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {getIconComponent(selectedBox.icon)}
                {selectedBox.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-muted-foreground">Cards</p>
                  <p className="text-xl font-semibold">{selectedBox.cardCount}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Value</p>
                  <p className="text-xl font-semibold">${selectedBox.totalValue.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Value</p>
                  <p className="text-xl font-semibold">
                    ${selectedBox.cardCount > 0 ? (selectedBox.totalValue / selectedBox.cardCount).toFixed(2) : '0.00'}
                  </p>
                </div>
              </div>
              
              <div className="text-center py-8 text-muted-foreground">
                <Box className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Box management interface coming soon</p>
                <p className="text-sm">Add, remove, and organize cards in this box</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default CollectionBoxes;