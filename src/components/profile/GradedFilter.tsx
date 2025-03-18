
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Shield } from "lucide-react";

interface GradedFilterProps {
  showGradedOnly: boolean;
  onGradedFilterChange: (checked: boolean) => void;
}

const GradedFilter = ({ showGradedOnly, onGradedFilterChange }: GradedFilterProps) => {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center space-x-2">
        <Checkbox 
          id="graded-filter" 
          checked={showGradedOnly}
          onCheckedChange={(checked) => onGradedFilterChange(checked as boolean)}
        />
        <Label 
          htmlFor="graded-filter" 
          className="text-sm font-medium cursor-pointer flex items-center gap-1.5"
        >
          <Shield className="h-4 w-4" />
          Graded
        </Label>
      </div>
      
      {showGradedOnly && (
        <Badge variant="outline" className="bg-primary/10 text-primary text-xs">
          Graded Only
        </Badge>
      )}
    </div>
  );
};

export default GradedFilter;
