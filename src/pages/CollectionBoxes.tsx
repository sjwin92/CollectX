import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Box,
  Plus,
  Search,
  Package,
  TrendingUp,
  Pencil,
  Trash2,
  ArrowRightLeft,
  X,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCollection } from "@/hooks/useCollection";
import {
  getCollectionBoxesWithStats,
  createCollectionBox,
  updateCollectionBox,
  deleteCollectionBox,
  getBoxCards,
  assignCardToBox,
  type CollectionBoxWithStats
} from "@/services/supabaseCollectionBoxService";

const BOXES_QUERY_KEY = ["collection-boxes"];

const CollectionBoxes = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [newBoxName, setNewBoxName] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [cardSearch, setCardSearch] = useState("");

  const { collection } = useCollection();

  const { data: boxes = [], isLoading } = useQuery({
    queryKey: BOXES_QUERY_KEY,
    queryFn: getCollectionBoxesWithStats,
  });

  const selectedBox = boxes.find((b) => b.id === selectedBoxId) || null;

  const { data: boxCards = [] } = useQuery({
    queryKey: ["collection-box-cards", selectedBoxId],
    queryFn: () => getBoxCards(selectedBoxId as string),
    enabled: !!selectedBoxId,
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => createCollectionBox(name),
    onSuccess: (box) => {
      queryClient.invalidateQueries({ queryKey: BOXES_QUERY_KEY });
      setNewBoxName("");
      setIsCreateOpen(false);
      toast({ title: "Box created", description: `${box.name} has been added to your collection` });
    },
    onError: () => toast({ title: "Couldn't create box", variant: "destructive" }),
  });

  const renameMutation = useMutation({
    mutationFn: (name: string) => updateCollectionBox(selectedBoxId as string, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BOXES_QUERY_KEY });
      setIsRenaming(false);
    },
    onError: () => toast({ title: "Couldn't rename box", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (boxId: string) => deleteCollectionBox(boxId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BOXES_QUERY_KEY });
      setSelectedBoxId(null);
      toast({ title: "Box deleted" });
    },
    onError: () => toast({ title: "Couldn't delete box", variant: "destructive" }),
  });

  const assignMutation = useMutation({
    mutationFn: ({ userCardId, boxId }: { userCardId: string; boxId: string | null }) =>
      assignCardToBox(userCardId, boxId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BOXES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["collection-box-cards", selectedBoxId] });
    },
    onError: () => toast({ title: "Couldn't update card", variant: "destructive" }),
  });

  const handleCreateBox = () => {
    if (!newBoxName.trim()) {
      toast({
        title: "Box name required",
        description: "Please enter a name for your new collection box",
        variant: "destructive"
      });
      return;
    }
    createMutation.mutate(newBoxName.trim());
  };

  const filteredBoxes = boxes.filter((box) =>
    box.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (box.description || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalCards = boxes.reduce((sum, box) => sum + box.cardCount, 0);
  const totalValue = boxes.reduce((sum, box) => sum + box.totalValue, 0);

  const availableCards = useMemo(() => {
    const assignedElsewhere = new Set(boxCards.map((c) => c.dbId));
    return collection
      .filter((c) => c.dbId && !assignedElsewhere.has(c.dbId))
      .filter((c) => c.name.toLowerCase().includes(cardSearch.toLowerCase()));
  }, [collection, boxCards, cardSearch]);

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
                    <p className="text-sm text-muted-foreground">Total Cards Boxed</p>
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
                    <p className="text-2xl font-bold">${totalValue.toLocaleString()}</p>
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

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
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
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateBox()}
                  />
                  <Button onClick={handleCreateBox} className="w-full" disabled={createMutation.isPending}>
                    {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Box"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <div className="text-center py-16 text-muted-foreground">
              <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin opacity-50" />
              <p>Loading your boxes...</p>
            </div>
          ) : filteredBoxes.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Box className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <h3 className="text-lg font-medium mb-2">
                {boxes.length === 0 ? "No collection boxes yet" : "No boxes match your search"}
              </h3>
              <p className="text-sm">
                {boxes.length === 0
                  ? "Create your first box to start organizing your collection"
                  : "Try a different search term"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBoxes.map((box) => (
                <Card
                  key={box.id}
                  className="cursor-pointer transition-all duration-200 border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10"
                  onClick={() => setSelectedBoxId(box.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Box className="h-5 w-5" />
                        <CardTitle className="text-lg">{box.name}</CardTitle>
                      </div>
                      <Badge variant="secondary">{box.cardCount}</Badge>
                    </div>
                    {box.description && (
                      <p className="text-sm text-muted-foreground">{box.description}</p>
                    )}
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
          )}

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

      {selectedBox && (
        <Dialog
          open={!!selectedBox}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedBoxId(null);
              setIsRenaming(false);
              setCardSearch("");
            }
          }}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 justify-between pr-6">
                <div className="flex items-center gap-2 flex-1">
                  <Box className="h-5 w-5 shrink-0" />
                  {isRenaming ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && renameMutation.mutate(renameValue)}
                        className="h-8"
                        autoFocus
                      />
                      <Button size="sm" onClick={() => renameMutation.mutate(renameValue)} disabled={renameMutation.isPending}>
                        Save
                      </Button>
                    </div>
                  ) : (
                    <span>{selectedBox.name}</span>
                  )}
                </div>
                {!isRenaming && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setRenameValue(selectedBox.name);
                        setIsRenaming(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => {
                        if (confirm(`Delete "${selectedBox.name}"? Cards inside will be unassigned, not deleted.`)) {
                          deleteMutation.mutate(selectedBox.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">In this box</h4>
                  <ScrollArea className="h-72 border rounded-md">
                    {boxCards.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8 px-4">
                        No cards in this box yet — add some from your collection on the right.
                      </p>
                    ) : (
                      <div className="p-2 space-y-1">
                        {boxCards.map((card) => (
                          <div key={card.dbId} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                            <span className="text-sm truncate">{card.name}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0"
                              disabled={assignMutation.isPending}
                              onClick={() => card.dbId && assignMutation.mutate({ userCardId: card.dbId, boxId: null })}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">Add from your collection</h4>
                  <Input
                    placeholder="Search your collection..."
                    value={cardSearch}
                    onChange={(e) => setCardSearch(e.target.value)}
                    className="mb-2 h-9"
                  />
                  <ScrollArea className="h-60 border rounded-md">
                    {availableCards.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8 px-4">
                        {collection.length === 0
                          ? "Your collection is empty — add cards first."
                          : "No matching cards to add."}
                      </p>
                    ) : (
                      <div className="p-2 space-y-1">
                        {availableCards.map((card) => (
                          <div key={card.dbId} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                            <span className="text-sm truncate">{card.name}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0"
                              disabled={assignMutation.isPending}
                              onClick={() => card.dbId && assignMutation.mutate({ userCardId: card.dbId, boxId: selectedBox.id })}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default CollectionBoxes;
