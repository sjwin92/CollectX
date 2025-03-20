
import React, { useState } from "react";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { quickAddFormSchema, QuickAddFormValues } from "./quickAddFormSchema";
import { PokemonCard } from "@/services/pokemonTcgApi";
import { useToast } from "@/hooks/use-toast";
import { FormActionButtons } from "./FormActionButtons";
import QuantityField from "./QuantityField";
import ConditionField from "./ConditionField";
import CheckboxField from "./CheckboxField";
import GradingFields from "./GradingFields";
import TradeFields from "./TradeFields";

interface QuickAddCardFormProps {
  card: PokemonCard;
  onClose: () => void;
}

const QuickAddCardForm = ({ card, onClose }: QuickAddCardFormProps) => {
  const { toast } = useToast();
  const [isGraded, setIsGraded] = useState(false);
  const [forTrade, setForTrade] = useState(false);
  
  const form = useForm<QuickAddFormValues>({
    resolver: zodResolver(quickAddFormSchema),
    defaultValues: {
      quantity: 1,
      condition: "NM",
      isGraded: false,
      forTrade: false,
      tradePreferences: "",
    },
  });
  
  const onSubmit = (data: QuickAddFormValues) => {
    // In a real app, this would save to a database
    console.log("Adding to collection:", {
      card: card.id,
      cardName: card.name,
      setId: card.set.id,
      setName: card.set.name,
      ...data
    });
    
    toast({
      title: "Card added to collection!",
      description: `Added ${data.quantity} ${card.name} card(s) to your collection`,
    });
    
    onClose();
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
        <QuantityField form={form} />
        
        <ConditionField form={form} />
        
        <CheckboxField 
          id="isGraded"
          label="Graded Card"
          checked={isGraded}
          onChange={handleGradedChange}
          form={form}
          fieldName="isGraded"
          description="Check if this card has been professionally graded"
        />
        
        {isGraded && <GradingFields form={form} />}
        
        <CheckboxField 
          id="forTrade"
          label="Available for Trade"
          checked={forTrade}
          onChange={handleTradeChange}
          form={form}
          fieldName="forTrade"
          description="Mark this card as available for trading with other collectors"
        />
        
        {forTrade && <TradeFields form={form} />}
        
        <div className="pt-4 flex justify-end space-x-2">
          <FormActionButtons 
            onCancel={onClose} 
            submitLabel="Add to Collection" 
          />
        </div>
      </form>
    </Form>
  );
};

export default QuickAddCardForm;
