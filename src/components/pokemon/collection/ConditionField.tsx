
import React from "react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UseFormReturn } from "react-hook-form";
import { CardFormValues, cardConditions } from "./cardFormSchema";

interface ConditionFieldProps {
  form: UseFormReturn<CardFormValues>;
}

const ConditionField = ({ form }: ConditionFieldProps) => {
  return (
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
  );
};

export default ConditionField;
