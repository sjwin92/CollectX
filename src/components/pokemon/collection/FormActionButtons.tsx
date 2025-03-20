
import React from "react";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";

interface FormActionButtonsProps {
  onCancel: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
}

export const FormActionButtons = ({ 
  onCancel, 
  isSubmitting, 
  submitLabel = "Add to Collection" 
}: FormActionButtonsProps) => {
  return (
    <DialogFooter>
      <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
        Cancel
      </Button>
      <Button type="submit" disabled={isSubmitting}>
        {submitLabel}
      </Button>
    </DialogFooter>
  );
};

export default FormActionButtons;
