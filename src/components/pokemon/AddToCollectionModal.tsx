
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/useUser";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface Card {
  id: string;
  name: string;
  images: {
    small?: string;
    large?: string;
  };
}

interface AddToCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: Card | null;
}

const conditionOptions = [
  "Mint",
  "Near Mint",
  "Excellent",
  "Good",
  "Played",
  "Poor"
];

const AddToCollectionModal = ({ isOpen, onClose, card }: AddToCollectionModalProps) => {
  const [quantity, setQuantity] = useState("1");
  const [condition, setCondition] = useState("Near Mint");
  const [notes, setNotes] = useState("");
  const [forTrade, setForTrade] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();
  const { user, isSignedIn } = useUser();
  
  const resetForm = () => {
    setQuantity("1");
    setCondition("Near Mint");
    setNotes("");
    setForTrade(false);
  };
  
  const handleClose = () => {
    resetForm();
    onClose();
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!card || !isSignedIn) {
      toast({
        title: "Authentication required",
        description: "Please sign in to add cards to your collection",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Call Supabase Edge Function to add card to collection
      const { data, error } = await supabase.functions.invoke("collection", {
        method: "POST",
        body: {
          cardId: card.id,
          quantity: parseInt(quantity),
          condition,
          notes: notes || null,
          for_trade: forTrade
        }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      toast({
        title: "Card added to collection",
        description: `${card.name} has been added to your collection`,
      });
      
      handleClose();
    } catch (error) {
      console.error("Error adding card to collection:", error);
      toast({
        title: "Failed to add card",
        description: "There was an error adding this card to your collection",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add to Collection</DialogTitle>
        </DialogHeader>
        
        {card && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-4">
              <div className="w-1/3">
                {card.images?.small && (
                  <img 
                    src={card.images.small} 
                    alt={card.name}
                    className="w-full rounded-md"
                  />
                )}
              </div>
              <div className="w-2/3">
                <h3 className="font-medium">{card.name}</h3>
                <p className="text-xs text-muted-foreground truncate">{card.id}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="condition">Condition</Label>
                <Select value={condition} onValueChange={setCondition}>
                  <SelectTrigger id="condition">
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    {conditionOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this card..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="for-trade"
                checked={forTrade}
                onCheckedChange={setForTrade}
              />
              <Label htmlFor="for-trade">Available for trade</Label>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add to Collection"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddToCollectionModal;
