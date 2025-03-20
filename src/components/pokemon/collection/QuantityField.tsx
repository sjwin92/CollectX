
import React from "react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import { CardFormValues } from "./cardFormSchema";

interface QuantityFieldProps {
  form: UseFormReturn<CardFormValues>;
}

const QuantityField = ({ form }: QuantityFieldProps) => {
  return (
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
  );
};

export default QuantityField;
