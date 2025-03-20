
import React from "react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { gradingCompanies } from "./cardFormSchema";
import { UseFormReturn } from "react-hook-form";
import { CardFormValues } from "./cardFormSchema";

interface GradingFieldsProps {
  form: UseFormReturn<CardFormValues>;
}

const GradingFields = ({ form }: GradingFieldsProps) => {
  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="gradingCompany"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Grading Company</FormLabel>
            <Select
              onValueChange={field.onChange}
              defaultValue={field.value}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select grading company" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {gradingCompanies.map((company) => (
                  <SelectItem key={company.value} value={company.value}>
                    {company.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={form.control}
        name="grade"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Grade (1-10)</FormLabel>
            <FormControl>
              <Input
                type="number"
                placeholder="9"
                min={1}
                max={10}
                step={0.5}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

export default GradingFields;
