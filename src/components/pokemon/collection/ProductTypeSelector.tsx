
import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UseFormReturn } from "react-hook-form";
import { productTypes } from "@/types/cardTypes";

interface ProductTypeSelectorProps {
  form: UseFormReturn<any>;
  fieldName?: string;
}

const ProductTypeSelector = ({ form, fieldName = "productType" }: ProductTypeSelectorProps) => {
  return (
    <FormField
      control={form.control}
      name={fieldName}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Product Type</FormLabel>
          <Select onValueChange={field.onChange} defaultValue={field.value || "card"}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Select product type" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {productTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <span className="flex items-center gap-2">
                    <span>{type.icon}</span>
                    <span>{type.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default ProductTypeSelector;
