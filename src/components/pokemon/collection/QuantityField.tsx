
import React from "react";
import { UseFormReturn } from "react-hook-form";
import { CardFormValues } from "./cardFormSchema";
import { Input } from "@/components/ui/input";
import FormFieldWrapper from "./FormFieldWrapper";

interface QuantityFieldProps {
  form: UseFormReturn<CardFormValues>;
}

const QuantityField = ({ form }: QuantityFieldProps) => {
  return (
    <FormFieldWrapper
      form={form}
      name="quantity"
      label="Quantity"
      description="How many cards to add"
    >
      <Input
        type="number"
        placeholder="1"
        min={1}
      />
    </FormFieldWrapper>
  );
};

export default QuantityField;
