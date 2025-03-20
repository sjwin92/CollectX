
import React, { useState } from "react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PokemonSet } from "@/services/api/pokemonTypes";
import { queryClient } from "@/lib/react-query";
import { useNavigate } from "react-router-dom";
import { ExtendedCardItemProps } from "@/types/cardTypes";

// Define card condition options
export const cardConditions = [
  { value: "M", label: "Mint (M)" },
  { value: "NM", label: "Near Mint (NM)" },
  { value: "LP", label: "Lightly Played (LP)" },
  { value: "MP", label: "Moderately Played (MP)" },
  { value: "HP", label: "Heavily Played (HP)" },
  { value: "D", label: "Damaged (D)" },
];

// Define grading companies
export const gradingCompanies = [
  { value: "PSA", label: "PSA" },
  { value: "BGS", label: "BGS" },
  { value: "SGC", label: "SGC" },
];

const formSchema = z.object({
  quantity: z.coerce.number().min(1, "Quantity must be at least 1").default(1),
  condition: z.string().min(1, "Please select a condition"),
  isGraded: z.boolean().default(false),
  gradingCompany: z.string().optional(),
  grade: z.coerce.number().min(1).max(10).optional(),
  forTrade: z.boolean().default(false),
  tradePreferences: z.string().optional()
});

type FormValues = z.infer<typeof formSchema>;

interface AddToCollectionModalProps {
  set: PokemonSet;
  open: boolean;
  onClose: () => void;
  cardId?: string;
  cardName?: string;
  cardImage?: string;
  cardRarity?: string;
  cardNumber?: string;
}

const AddToCollectionModal = ({ 
  set, 
  open, 
  onClose, 
  cardId, 
  cardName, 
  cardImage, 
  cardRarity,
  cardNumber
}: AddToCollectionModalProps) => {
  const { toast } = useToast();
  const [isGraded, setIsGraded] = useState(false);
  const [forTrade, setForTrade] = useState(false);
  const navigate = useNavigate();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity: 1,
      condition: "NM",
      isGraded: false,
      forTrade: false,
      tradePreferences: "",
    },
  });
  
  const onSubmit = (data: FormValues) => {
    // Prepare card data
    const newCard: ExtendedCardItemProps = {
      id: cardId || `${set.id}-${Date.now()}`,
      name: cardName || `Card from ${set.name}`,
      imageUrl: cardImage || "https://archives.bulbagarden.net/media/upload/1/17/Cardback.jpg",
      rarity: cardRarity || "Common",
      number: cardNumber || "",
      condition: data.condition,
      estimatedValue: "Unknown",
      graded: data.isGraded,
      set: {
        id: set.id,
        name: set.name,
        series: set.series,
        releaseDate: set.releaseDate
      },
      forTrade: data.forTrade
    };
    
    if (data.isGraded && data.gradingCompany && data.grade) {
      newCard.gradingCompany = data.gradingCompany;
      newCard.gradeScore = data.grade.toString();
    }
    
    if (data.forTrade && data.tradePreferences) {
      newCard.tradePreferences = data.tradePreferences;
    }
    
    // Get existing collection from localStorage
    const savedCollection = localStorage.getItem('myCollection');
    let collection: ExtendedCardItemProps[] = [];
    
    if (savedCollection) {
      try {
        collection = JSON.parse(savedCollection);
      } catch (error) {
        console.error("Error parsing collection", error);
        collection = [];
      }
    }
    
    // Add new card to collection
    collection.push(newCard);
    
    // Save back to localStorage
    localStorage.setItem('myCollection', JSON.stringify(collection));
    
    // If tradable, add to tradable collection
    if (data.forTrade) {
      const savedTradable = localStorage.getItem('tradableCards');
      let tradable: ExtendedCardItemProps[] = [];
      
      if (savedTradable) {
        try {
          tradable = JSON.parse(savedTradable);
        } catch (error) {
          console.error("Error parsing tradable cards", error);
          tradable = [];
        }
      }
      
      tradable.push(newCard);
      localStorage.setItem('tradableCards', JSON.stringify(tradable));
    }
    
    // Show success toast
    toast({
      title: "Card added to collection!",
      description: `Added ${newCard.name} from ${set.name} set to your collection.`,
    });
    
    // Invalidate collection data to refresh UI
    queryClient.invalidateQueries({ queryKey: ['collection'] });
    
    // Close modal
    onClose();
    
    // Redirect to collection page
    navigate("/collection");
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add to Collection</DialogTitle>
          <DialogDescription>
            Add {cardName || "cards"} from {set.name} to your collection
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="1"
                      min={1}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    How many cards to add
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="condition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Condition</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {cardConditions.map((condition) => (
                        <SelectItem key={condition.value} value={condition.value}>
                          {condition.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The condition of the cards
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isGraded"
                checked={isGraded}
                onChange={(e) => {
                  setIsGraded(e.target.checked);
                  form.setValue("isGraded", e.target.checked);
                  if (!e.target.checked) {
                    form.setValue("gradingCompany", undefined);
                    form.setValue("grade", undefined);
                  }
                }}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="isGraded" className="text-sm font-medium">
                Is this card graded?
              </label>
            </div>
            
            {isGraded && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="gradingCompany"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Grading Company</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select grading company" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {gradingCompanies.map((company) => (
                            <SelectItem key={company.value} value={company.value}>
                              {company.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="grade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Grade (1-10)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="9"
                          min={1}
                          max={10}
                          step={0.5}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
            
            <FormField
              control={form.control}
              name="forTrade"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="forTrade"
                      checked={forTrade}
                      onChange={(e) => {
                        setForTrade(e.target.checked);
                        form.setValue("forTrade", e.target.checked);
                        if (!e.target.checked) {
                          form.setValue("tradePreferences", "");
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <label htmlFor="forTrade" className="text-sm font-medium">
                      Mark as available for trade
                    </label>
                  </div>
                </FormItem>
              )}
            />
            
            {forTrade && (
              <FormField
                control={form.control}
                name="tradePreferences"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trade Preferences</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="What would you like to trade for?"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Add to Collection</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddToCollectionModal;
