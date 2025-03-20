
import React from "react";
import { Button } from "@/components/ui/button";

interface FormActionButtonsProps {
  onCancel: () => void;
  submitLabel?: string;
  isSubmitting?: boolean;
}

export const FormActionButtons = ({ 
  onCancel, 
  submitLabel = "Save",
  isSubmitting = false
}: FormActionButtonsProps) => {
  return (
    <div className="flex justify-end space-x-2 mt-4">
      <Button 
        type="button"
        variant="outline"
        onClick={onCancel}
        disabled={isSubmitting}
      >
        Cancel
      </Button>
      <Button 
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Saving..." : submitLabel}
      </Button>
    </div>
  );
};

export default FormActionButtons;
