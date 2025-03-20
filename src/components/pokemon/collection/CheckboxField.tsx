
import React from "react";
import { UseFormReturn } from "react-hook-form";
import { CardFormValues } from "./cardFormSchema";

interface CheckboxFieldProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  form?: UseFormReturn<CardFormValues>;
  fieldName?: keyof CardFormValues;
}

const CheckboxField = ({ 
  id, 
  label, 
  checked, 
  onChange, 
  form, 
  fieldName 
}: CheckboxFieldProps) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.checked);
    if (form && fieldName) {
      form.setValue(fieldName, e.target.checked);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={handleChange}
        className="h-4 w-4 rounded border-gray-300"
      />
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
    </div>
  );
};

export default CheckboxField;
