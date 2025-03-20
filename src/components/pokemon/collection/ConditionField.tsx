
import React from "react";
import { UseFormReturn } from "react-hook-form";
import { CardFormValues, cardConditions } from "./cardFormSchema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import FormFieldWrapper from "./FormFieldWrapper";

interface ConditionFieldProps {
  form: UseFormReturn<CardFormValues>;
}

const ConditionField = ({ form }: ConditionFieldProps) => {
  return (
    <FormFieldWrapper
      form={form}
      name="condition"
      label="Condition"
      description="The condition of the cards"
    >
      {/* Spread the field props to properly bind the form control */}
      {(field) => (
        <Select 
          onValueChange={field.onChange}
          defaultValue={field.value}
          value={field.value}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select condition" />
          </SelectTrigger>
          <SelectContent>
            {cardConditions.map((condition) => (
              <SelectItem key={condition.value} value={condition.value}>
                {condition.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </FormFieldWrapper>
  );
};

export default ConditionField;
