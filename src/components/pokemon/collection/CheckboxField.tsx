
import React from "react";
import { UseFormReturn } from "react-hook-form";
import { CardFormValues } from "./cardFormSchema";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
} from "@/components/ui/form";

interface CheckboxFieldProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  form?: UseFormReturn<any>;
  fieldName?: string;
  description?: string;
}

const CheckboxField = ({ 
  id, 
  label, 
  checked, 
  onChange, 
  form, 
  fieldName,
  description 
}: CheckboxFieldProps) => {
  const handleChange = (checked: boolean) => {
    onChange(checked);
    if (form && fieldName) {
      form.setValue(fieldName, checked);
    }
  };

  return (
    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
      <FormControl>
        <Checkbox
          checked={checked}
          onCheckedChange={handleChange}
          id={id}
        />
      </FormControl>
      <div className="space-y-1 leading-none">
        <FormLabel htmlFor={id}>{label}</FormLabel>
        {description && (
          <FormDescription>
            {description}
          </FormDescription>
        )}
      </div>
    </FormItem>
  );
};

export default CheckboxField;
