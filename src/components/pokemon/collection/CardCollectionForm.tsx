
import React, { useState } from "react";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";

import { cardFormSchema, CardFormValues } from "./cardFormSchema";
import GradingFields from "./GradingFields";
import TradeFields from "./TradeFields";
import QuantityField from "./QuantityField";
import ConditionField from "./ConditionField";
import CheckboxField from "./CheckboxField";
import FormActionButtons from "./FormActionButtons";
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
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  
  const onSubmit = async (data: CardFormValues) => {
    setIsSubmitting(true);
    
    try {
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGradedChange = (checked: boolean) => {
    setIsGraded(checked);
    form.setValue("isGraded", checked);
    if (!checked) {
      form.setValue("gradingCompany", undefined);
      form.setValue("grade", undefined);
    }
  };

  const handleTradeChange = (checked: boolean) => {
    setForTrade(checked);
    form.setValue("forTrade", checked);
    if (!checked) {
      form.setValue("tradePreferences", "");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <QuantityField form={form} />
        <ConditionField form={form} />
        
        <CheckboxField 
          id="isGraded"
          label="Is this card graded?"
          checked={isGraded}
          onChange={handleGradedChange}
          form={form}
          fieldName="isGraded"
        />
        
        {isGraded && <GradingFields form={form} />}
        
        <CheckboxField 
          id="forTrade"
          label="Mark as available for trade"
          checked={forTrade}
          onChange={handleTradeChange}
          form={form}
          fieldName="forTrade"
        />
        
        {forTrade && <TradeFields form={form} />}
        
        <FormActionButtons onCancel={onClose} isSubmitting={isSubmitting} />
      </form>
    </Form>
  );
};

export default CardCollectionForm;
