
import React, { useState } from "react";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { quickAddFormSchema, QuickAddFormValues } from "./quickAddFormSchema";
import { PokemonCard } from "@/services/pokemonTcgApi";
import { useToast } from "@/hooks/use-toast";
import FormActionButtons from "./FormActionButtons";
import QuantityField from "./QuantityField";
import ConditionField from "./ConditionField";
import CheckboxField from "./CheckboxField";
import GradingFields from "./GradingFields";
import TradeFields from "./TradeFields";
import ProductTypeSelector from "./ProductTypeSelector";
import SealedProductFields from "./SealedProductFields";
import { ExtendedCardItemProps } from "@/types/cardTypes";
import { addCardToCollection } from "@/services/supabaseCollectionService";
import { useUser } from "@/hooks/useUser";

interface QuickAddCardFormProps {
  card: PokemonCard;
  onClose: () => void;
}

const QuickAddCardForm = ({ card, onClose }: QuickAddCardFormProps) => {
  const { toast } = useToast();
  const [isGraded, setIsGraded] = useState(false);
  const [forTrade, setForTrade] = useState(false);
  const [forSale, setForSale] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<QuickAddFormValues>({
    resolver: zodResolver(quickAddFormSchema),
    defaultValues: {
      quantity: 1,
      condition: "NM",
      isGraded: false,
      forTrade: false,
      forSale: false,
      tradePreferences: "",
      productType: "card",
      isSealed: false,
      packCount: undefined,
      setCode: "",
    },
  });
  
  const watchedProductType = form.watch("productType");
  
  const onSubmit = async (data: QuickAddFormValues) => {
    setIsSubmitting(true);
    
    try {
      // Create the card object to add to collection
      const newCard: ExtendedCardItemProps = {
        id: card.id,
        name: card.name,
        imageUrl: card.images?.small || card.images?.large || "",
        rarity: card.rarity || "Unknown",
        number: card.number || "",
        condition: data.condition,
        estimatedValue: "Unknown",
        set: {
          id: card.set.id,
          name: card.set.name,
        },
        forTrade: data.forTrade,
        forSale: data.forSale,
        graded: data.isGraded,
        quantity: data.quantity,
        productType: data.productType === 'card' ? 'single' : (data.productType || 'single') as any,
        isSealed: data.isSealed,
        packCount: data.packCount,
        setCode: data.setCode
      };
      
      // Add grading info if card is graded
      if (data.isGraded && data.gradingCompany && data.grade) {
        newCard.gradingCompany = data.gradingCompany;
        newCard.gradeScore = data.grade.toString();
      }
      
      // Add trade preferences if marked for trade
      if (data.forTrade && data.tradePreferences) {
        newCard.tradePreferences = data.tradePreferences;
      }
      
      console.log("Adding to collection:", newCard);
      
      // Add card to collection with all details
      await addCardToCollection(newCard);
      
      const productTypeLabel = watchedProductType === 'card' ? 'card' : `${watchedProductType.replace('-', ' ')}`;
      
      toast({
        title: "Item added to collection!",
        description: `Added ${data.quantity}x ${card.name} (${productTypeLabel}) to your collection`,
      });
      
      onClose();
    } catch (error) {
      console.error("Error adding item to collection:", error);
      toast({
        title: "Error adding item",
        description: "There was a problem adding this item to your collection",
        variant: "destructive"
      });
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

  const handleSaleChange = (checked: boolean) => {
    setForSale(checked);
    form.setValue("forSale", checked);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
        <ProductTypeSelector form={form} lockedToCard={true} />
        
        <QuantityField form={form} />
        
        <ConditionField form={form} />
        
        <SealedProductFields form={form} productType={watchedProductType || "card"} />
        
        {watchedProductType === 'card' && (
          <CheckboxField 
            id="isGraded"
            label="Graded Card"
            checked={isGraded}
            onChange={handleGradedChange}
            form={form}
            fieldName="isGraded"
            description="Check if this card has been professionally graded"
          />
        )}
        
        {isGraded && watchedProductType === 'card' && <GradingFields form={form} />}
        
        <div className="space-y-3">
          <CheckboxField 
            id="forTrade"
            label="Available for Trade"
            checked={forTrade}
            onChange={handleTradeChange}
            form={form}
            fieldName="forTrade"
            description="Mark this item as available for trading with other collectors"
          />
          
          <CheckboxField 
            id="forSale"
            label="Available for Sale"
            checked={forSale}
            onChange={handleSaleChange}
            form={form}
            fieldName="forSale"
            description="Mark this item as available for sale to other collectors"
          />
        </div>
        
        {forTrade && <TradeFields form={form} />}
        
        <div className="pt-4 flex justify-end space-x-2">
          <FormActionButtons 
            onCancel={onClose} 
            submitLabel="Add to Collection"
            isSubmitting={isSubmitting}
          />
        </div>
      </form>
    </Form>
  );
};

export default QuickAddCardForm;
