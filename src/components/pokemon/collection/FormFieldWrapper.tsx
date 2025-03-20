
import React, { ReactNode } from "react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { UseFormReturn } from "react-hook-form";

interface FormFieldWrapperProps {
  form: UseFormReturn<any>;
  name: string;
  label: string;
  description?: string;
  children: ReactNode | ((fieldProps: any) => ReactNode);
}

const FormFieldWrapper = ({
  form,
  name,
  label,
  description,
  children,
}: FormFieldWrapperProps) => {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            {typeof children === "function" 
              ? children(field)
              : React.cloneElement(children as React.ReactElement, { ...field })}
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default FormFieldWrapper;
