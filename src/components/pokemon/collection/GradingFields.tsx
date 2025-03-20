
import React from "react";
import { UseFormReturn } from "react-hook-form";
import { QuickAddFormValues } from "./quickAddFormSchema";
import { gradingCompanies } from "./quickAddFormSchema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import FormFieldWrapper from "./FormFieldWrapper";

interface GradingFieldsProps {
  form: UseFormReturn<any>;
}

const GradingFields = ({ form }: GradingFieldsProps) => {
  return (
    <div className="space-y-4">
      <FormFieldWrapper
        form={form}
        name="gradingCompany"
        label="Grading Company"
      >
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select grading company" />
          </SelectTrigger>
          <SelectContent>
            {gradingCompanies.map((company) => (
              <SelectItem key={company.value} value={company.value}>
                {company.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormFieldWrapper>
      
      <FormFieldWrapper
        form={form}
        name="grade"
        label="Grade (1-10)"
      >
        <Input
          type="number"
          placeholder="9"
          min={1}
          max={10}
          step={0.5}
        />
      </FormFieldWrapper>
    </div>
  );
};

export default GradingFields;
