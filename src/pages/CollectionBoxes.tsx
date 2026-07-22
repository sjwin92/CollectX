import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Box,
  Plus,
  Search,
  Star,
  Shield,
  TrendingUp,
  Users,
  Package,
  Trash2,
  ArrowRightLeft,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  listBoxes,
  createBox,
  deleteBox,
  getBoxItems,
  getAvailableCardsForBox,
  addCardToBox,
  removeCardFromBox,
  type CardBox,
} from "@/services/cardBoxService";

const ICON_OPTIONS: { value: string; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "Box", label: "Box", Icon: Box },
  { value: "ArrowRightLeft", label: "Trade", Icon: ArrowRightLeft },
  { value: "Shield", label: "Shield", Icon: Shield },
  { value: "TrendingUp", label: "Value", Icon: TrendingUp },
  { value: "Star", label: "Star", Icon: Star },
  { value: "Users", label: "Trainers", Icon: Users },
  { value: "Package", label: "Package", Icon: Package },
];

const COLOR_OPTIONS = ["blue", "red", "green", "purple", "orange", "indigo"];

const getIconComponent = (iconName: string) => {
  const match = ICON_OPTIONS.find((o) => o.value === iconName);
  const IconComponent = match?.Icon || Box;
  return <IconComponent className="h-5 w-5" />;
};

const getColorClasses = (color: string) => {
  const colorMap: { [key: string]: string } = {
    blue: "border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10",
    red: "border-red-500/20 bg-red-500/5 hover:bg-red-500/10",
    green: "border-green-500/20 bg-green-500/5 hover:bg-green-500/10",
    purple: "border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10",
    orange: "border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10",
    indigo: "border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10",
  };
  return colorMap[color] || colorMap.blue;
};

const CollectionBoxes = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newBoxName, setNewBoxName] = useState("");
  const [newBoxDescription, setNewBoxDescription] = useState("");
  const [newBoxIcon, setNewBoxIcon] = useState("Box");
  const [newBoxColor, setNewBoxColor] = useState("blue");

  const [selectedBox, setSelectedBox] = useState<CardBox | null>(null);
  const [addCardOpen, setAddCardOpen] = useState(false);
  const [cardSearchTerm, setCardSearchTerm] = useState("");

  const boxesQuery = useQuery({ queryKey: ["card-boxes"], queryFn: listBoxes });

  const boxItemsQuery = useQuery({
    queryKey: ["card-box-items", selectedBox?.id],
    queryFn: () => getBoxItems(selectedBox!.id),
    enabled: !!selectedBox,
  });

  const availableCardsQuery = useQuery({
    queryKey: ["card-box-available", selectedBox?.id],
    queryFn: () => getAvailableCardsForBox(selectedBox!.id),
    enabled: !!selectedBox && addCardOpen,
  });

  const oops = (description: string) => (err?: unknown) =>
    toast({
      variant: "destructive",
      title: "Something went wrong",
      description: err instanceof Error ? err.message : description,
    });

  const createMutation = useMutation({
    mutationFn: createBox,
    onSuccess: (box) => {
      toast({ title: "Box created", description: `${box.name} has been added to your collection` });
      queryClient.invalidateQueries({ queryKey: ["card-boxes"] });
      setNewBoxName("");
      setNewBoxDescription("");
      setNewBoxIcon("Box");
      setNewBoxColor("blue");
      setCreateOpen(false);
    },
    onError: oops("Couldn't create the box."),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBox,
    onSuccess: () => {
      toast({ title: "Box deleted" });
      queryClient.invalidateQueries({ queryKey: ["card-boxes"] });
      setSelectedBox(null);
    },
    onError: oops("Couldn't delete the box."),
  });

  const addCardMutation = useMutation({
    mutationFn: ({ boxId, userCardId }: { boxId: string; userCardId: string }) => addCardToBox(boxId, userCardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["card-box-items", selectedBox?.id] });
      queryClient.invalidateQueries({ queryKey: ["card-box-available", selectedBox?.id] });
      queryClient.invalidateQueries({ queryKey: ["card-boxes"] });
    },
    onError: oops("Couldn't add that card to the box."),
  });

  const removeCardMutation = useMutation({
    mutationFn: removeCardFromBox,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["card-box-items", selectedBox?.id] });
      queryClient.invalidateQueries({ queryKey: ["card-box-available", selectedBox?.id] });
      queryClient.invalidateQueries({ queryKey: ["card-boxes"] });
    },
    onError: oops("Couldn't remove that card from the box."),
  });

  const boxes = boxesQuery.data ?? [];

  const filteredBoxes = boxes.filter(
    (box) =>
      box.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (box.description ?? "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalCards = boxes.reduce((sum, box) => sum + box.cardCount, 0);
  const totalValue = boxes.reduce((sum, box) => sum + box.totalValue, 0);

  const handleCreateBox = () => {
    if (!newBoxName.trim()) {
      toast({
        title: "Box name required",
        description: "Please enter a name for your new collection box",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate({
      name: newBoxName,
      description: newBoxDescription,
      icon: newBoxIcon,
      color: newBoxColor,
    });
  };

  const filteredAvailableCards = (availableCardsQuery.data ?? []).filter((card) =>
    card.cardName.toLowerCase().includes(cardSearchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 pt-24 pb-16">
        <div className="container">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Box className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Collection Boxes</h1>
            </div>
            <p className="text-muted-foreground">
              Organize your Pokémon cards into custom boxes for easy management and trading
            </p>
          </div>

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
                    <p className="text-2xl font-bold">{boxes.length}</p>
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
                    <p className="text-2xl font-bold">${totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

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

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
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
                  />
                  <Textarea
                    placeholder="Description (optional)"
                    value={newBoxDescription}
                    onChange={(e) => setNewBoxDescription(e.target.value)}
                    rows={2}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Select value={newBoxIcon} onValueChange={setNewBoxIcon}>
                      <SelectTrigger>
                        <SelectValue placeholder="Icon" />
                      </SelectTrigger>
                      <SelectContent>
                        {ICON_OPTIONS.map(({ value, label, Icon }) => (
                          <SelectItem key={value} value={value}>
                            <span className="flex items-center gap-2">
                              <Icon className="h-4 w-4" /> {label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={newBoxColor} onValueChange={setNewBoxColor}>
                      <SelectTrigger>
                        <SelectValue placeholder="Color" />
                      </SelectTrigger>
                      <SelectContent>
                        {COLOR_OPTIONS.map((color) => (
                          <SelectItem key={color} value={color}>
                            <span className="capitalize">{color}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleCreateBox} className="w-full" disabled={createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create Box
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {boxesQuery.isLoading ? (
            <div className="text-center py-16 text-muted-foreground">
              <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin" />
              Loading your collection boxes...
            </div>
          ) : boxes.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground border rounded-lg">
              <Box className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <h3 className="text-lg font-semibold text-foreground mb-1">No collection boxes yet</h3>
              <p className="mb-4">Create your first box to start organizing your cards.</p>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create New Box
              </Button>
            </div>
          ) : (
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
                    {box.description && <p className="text-sm text-muted-foreground">{box.description}</p>}
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Value</p>
                        <p className="font-semibold">
                          ${box.totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        Manage
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* Box Detail Modal */}
      {selectedBox && (
        <Dialog
          open={!!selectedBox}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedBox(null);
              setAddCardOpen(false);
              setCardSearchTerm("");
            }
          }}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between gap-2 pr-6">
                <span className="flex items-center gap-2">
                  {getIconComponent(selectedBox.icon)}
                  {selectedBox.name}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => deleteMutation.mutate(selectedBox.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
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
                  <p className="text-xl font-semibold">
                    ${selectedBox.totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Value</p>
                  <p className="text-xl font-semibold">
                    $
                    {selectedBox.cardCount > 0
                      ? (selectedBox.totalValue / selectedBox.cardCount).toFixed(2)
                      : "0.00"}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Cards in this box</h4>
                <Dialog open={addCardOpen} onOpenChange={setAddCardOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Cards
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Add cards to {selectedBox.name}</DialogTitle>
                    </DialogHeader>
                    <Input
                      placeholder="Search your collection..."
                      value={cardSearchTerm}
                      onChange={(e) => setCardSearchTerm(e.target.value)}
                      className="mb-3"
                    />
                    {availableCardsQuery.isLoading ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin" />
                        Loading your collection...
                      </div>
                    ) : filteredAvailableCards.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        {availableCardsQuery.data?.length === 0
                          ? "All your cards are already in this box, or your collection is empty."
                          : "No cards match your search."}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {filteredAvailableCards.map((card) => (
                          <div
                            key={card.id}
                            className="flex items-center justify-between gap-3 p-2 rounded-md border"
                          >
                            <div className="min-w-0">
                              <p className="font-medium truncate">{card.cardName}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {card.setName || "Unknown set"} · Qty {card.quantity}
                                {card.tradeValue ? ` · $${card.tradeValue.toFixed(2)}` : ""}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => addCardMutation.mutate({ boxId: selectedBox.id, userCardId: card.id })}
                              disabled={addCardMutation.isPending}
                            >
                              Add
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </div>

              {boxItemsQuery.isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin" />
                  Loading cards...
                </div>
              ) : (boxItemsQuery.data ?? []).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Box className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>This box is empty</p>
                  <p className="text-sm">Add cards from your collection above</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(boxItemsQuery.data ?? []).map((item) => (
                    <div key={item.itemId} className="flex items-center justify-between gap-3 p-2 rounded-md border">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{item.cardName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {item.setName || "Unknown set"} · Qty {item.quantity}
                          {item.tradeValue ? ` · $${item.tradeValue.toFixed(2)}` : ""}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => removeCardMutation.mutate(item.itemId)}
                        disabled={removeCardMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default CollectionBoxes;
