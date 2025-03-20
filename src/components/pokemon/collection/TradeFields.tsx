
import React from "react";
import { UseFormReturn } from "react-hook-form";
import { CardFormValues } from "./cardFormSchema";
import { Input } from "@/components/ui/input";
import FormFieldWrapper from "./FormFieldWrapper";

interface TradeFieldsProps {
  form: UseFormReturn<CardFormValues>;
}

const TradeFields = ({ form }: TradeFieldsProps) => {
  return (
    <FormFieldWrapper
      form={form}
      name="tradePreferences"
      label="Trade Preferences"
      description="What would you like to trade this card for?"
    >
      <Input
        placeholder="What would you like to trade for?"
      />
    </FormFieldWrapper>
  );
};

export default TradeFields;
