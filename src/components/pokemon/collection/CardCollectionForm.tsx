
import React, { useState } from "react";
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";

import { cardFormSchema, CardFormValues, cardConditions } from "./cardFormSchema";
import GradingFields from "./GradingFields";
import TradeFields from "./TradeFields";
import { PokemonSet } from "@/services/api/pokemonTypes";
import { ExtendedCardItemProps } from "@/types/cardTypes";
import { addCardToCollection, addCardToTradable } from "@/services/collectionService";
import { useToast } from "@/hooks/use-toast";

interface CardCollectionFormProps {
  set: PokemonSet;
  onClose: () => void;
  cardId?: string;
  cardName?: string;
  cardImage?: string;
  cardRarity?: string;
  cardNumber?: string;
}

const CardCollectionForm = ({ 
  set, 
  onClose, 
  cardId, 
  cardName, 
  cardImage, 
  cardRarity,
  cardNumber
}: CardCollectionFormProps) => {
  const [isGraded, setIsGraded] = useState(false);
  const [forTrade, setForTrade] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const form = useForm<CardFormValues>({
    resolver: zodResolver(cardFormSchema),
    defaultValues: {
      quantity: 1,
      condition: "NM",
      isGraded: false,
      forTrade: false,
      tradePreferences: "",
    },
  });
  
  const onSubmit = (data: CardFormValues) => {
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
    
    // Add to collection and tradable if needed
    addCardToCollection(newCard);
    
    if (data.forTrade) {
      addCardToTradable(newCard);
    }
    
    // Show success toast
    toast({
      title: "Card added to collection!",
      description: `Added ${newCard.name} from ${set.name} set to your collection.`,
    });
    
    // Close modal
    onClose();
    
    // Redirect to collection page after a short delay to ensure data is saved
    setTimeout(() => {
      navigate("/collection");
    }, 100);
  };

  return (
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
        
        {isGraded && <GradingFields form={form} />}
        
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
        
        {forTrade && <TradeFields form={form} />}
        
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Add to Collection</Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

export default CardCollectionForm;
