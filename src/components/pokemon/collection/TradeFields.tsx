
import React from "react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import { CardFormValues } from "./cardFormSchema";

interface TradeFieldsProps {
  form: UseFormReturn<CardFormValues>;
}

const TradeFields = ({ form }: TradeFieldsProps) => {
  return (
    <FormField
      control={form.control}
      name="tradePreferences"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Trade Preferences</FormLabel>
          <FormControl>
            <Input
              placeholder="What would you like to trade for?"
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default TradeFields;
