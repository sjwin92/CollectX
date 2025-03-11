
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/useUser";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Minus } from "lucide-react";

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

// Map of professional grading conditions with descriptions
const conditionOptions = [
  { value: "Gem Mint", label: "Gem Mint (PSA 10)", description: "Perfect card with no visible flaws" },
  { value: "Mint", label: "Mint (PSA 9)", description: "Nearly perfect with tiny imperfections" },
  { value: "Near Mint", label: "Near Mint (PSA 8)", description: "Slight wear, minor scratches" },
  { value: "Excellent", label: "Excellent (PSA 6-7)", description: "Noticeable wear, edge whitening" },
  { value: "Good", label: "Good (PSA 4-5)", description: "Obvious wear, some creases" },
  { value: "Fair", label: "Fair (PSA 2-3)", description: "Heavy wear, creases" },
  { value: "Poor", label: "Poor (PSA 1)", description: "Severe damage or major creases" }
];

const AddToCollectionModal = ({ isOpen, onClose, card }: AddToCollectionModalProps) => {
  const [quantity, setQuantity] = useState(1);
  const [condition, setCondition] = useState("Near Mint");
  const [notes, setNotes] = useState("");
  const [forTrade, setForTrade] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();
  const { user, isSignedIn } = useUser();
  
  const resetForm = () => {
    setQuantity(1);
    setCondition("Near Mint");
    setNotes("");
    setForTrade(false);
  };
  
  const handleClose = () => {
    resetForm();
    onClose();
  };

  const increaseQuantity = () => {
    setQuantity(prev => prev + 1);
  };

  const decreaseQuantity = () => {
    setQuantity(prev => prev > 1 ? prev - 1 : 1);
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
      const { data, error } = await supabase.from("user_collections").insert({
        card_id: card.id,
        quantity,
        condition,
        notes: notes || null,
        for_trade: forTrade,
        grading_company: "PSA", // Default to PSA since we're using their scale
        grading_value: condition
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
            
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <div className="flex items-center rounded-md border">
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 rounded-r-none border-r"
                  onClick={decreaseQuantity}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="flex-1 text-center">{quantity}</div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 rounded-l-none border-l"
                  onClick={increaseQuantity}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="condition">Condition</Label>
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger id="condition">
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  {conditionOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <div>{option.label}</div>
                        <div className="text-xs text-muted-foreground">{option.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
