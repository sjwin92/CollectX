
import React from "react";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";

interface FormActionButtonsProps {
  onCancel: () => void;
  isSubmitting?: boolean;
}

const FormActionButtons = ({ onCancel, isSubmitting }: FormActionButtonsProps) => {
  return (
    <DialogFooter>
      <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
        Cancel
      </Button>
      <Button type="submit" disabled={isSubmitting}>
        Add to Collection
      </Button>
    </DialogFooter>
  );
};

export default FormActionButtons;
