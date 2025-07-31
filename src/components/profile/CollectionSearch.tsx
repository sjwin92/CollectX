
import React from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import GradedFilter from "./GradedFilter";

interface CollectionSearchProps {
  searchQuery: string;
  showGradedOnly: boolean;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onGradedFilterChange: (checked: boolean) => void;
}

const CollectionSearch = ({
  searchQuery,
  showGradedOnly,
  onSearchChange,
  onGradedFilterChange,
}: CollectionSearchProps) => {
  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input 
          placeholder="Search your collection..." 
          className="pl-9"
          value={searchQuery}
          onChange={(e) => {
            console.log("Input change detected:", e.target.value);
            onSearchChange(e);
          }}
          onFocus={() => console.log("Input focused")}
          onBlur={() => console.log("Input blurred")}
          style={{ pointerEvents: 'auto', zIndex: 1 }}
        />
      </div>
      
      <GradedFilter 
        showGradedOnly={showGradedOnly}
        onGradedFilterChange={onGradedFilterChange}
      />
    </div>
  );
};

export default CollectionSearch;
