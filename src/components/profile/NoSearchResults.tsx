
import React from "react";

interface NoSearchResultsProps {
  searchQuery: string;
  showGradedOnly: boolean;
}

const NoSearchResults = ({ searchQuery, showGradedOnly }: NoSearchResultsProps) => {
  return (
    <div className="text-center py-8">
      <p className="text-muted-foreground">
        {showGradedOnly 
          ? "No graded cards found" 
          : searchQuery 
            ? `No cards matching "${searchQuery}"` 
            : "No cards in your collection"}
      </p>
    </div>
  );
};

export default NoSearchResults;
