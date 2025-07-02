
import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UseFormReturn } from "react-hook-form";
import { productTypes } from "@/types/cardTypes";

interface ProductTypeSelectorProps {
  form: UseFormReturn<any>;
  fieldName?: string;
  lockedToCard?: boolean;
}

const ProductTypeSelector = ({ form, fieldName = "productType", lockedToCard = false }: ProductTypeSelectorProps) => {
  const cardType = productTypes.find(type => type.value === "card");
  
  if (lockedToCard) {
    return (
      <FormField
        control={form.control}
        name={fieldName}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Product Type</FormLabel>
            <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/30">
              <span>{cardType?.icon}</span>
              <span className="font-medium">{cardType?.label}</span>
              <span className="text-sm text-muted-foreground ml-auto">(Individual Card)</span>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

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
