
import React from "react";
import { UseFormReturn } from "react-hook-form";
import { CardFormValues } from "./cardFormSchema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";
import FormFieldWrapper from "./FormFieldWrapper";

interface QuantityFieldProps {
  form: UseFormReturn<CardFormValues>;
}

const QuantityField = ({ form }: QuantityFieldProps) => {
  const currentQuantity = form.watch("quantity") || 1;
  
  const incrementQuantity = () => {
    form.setValue("quantity", currentQuantity + 1);
  };
  
  const decrementQuantity = () => {
    if (currentQuantity > 1) {
      form.setValue("quantity", currentQuantity - 1);
    }
  };

  return (
    <FormFieldWrapper
      form={form}
      name="quantity"
      label="Quantity"
      description="How many cards to add"
    >
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={decrementQuantity}
          disabled={currentQuantity <= 1}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <Input
          type="number"
          placeholder="1"
          min={1}
          className="text-center"
          {...form.register("quantity", { valueAsNumber: true })}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={incrementQuantity}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </FormFieldWrapper>
  );
};

export default QuantityField;
