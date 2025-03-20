
import React from "react";

interface NoSearchResultsProps {
  searchQuery: string;
  showGradedOnly: boolean;
}

const NoSearchResults = ({ searchQuery, showGradedOnly }: NoSearchResultsProps) => {
  const getMessage = () => {
    if (showGradedOnly) {
      return "No graded cards found in your collection";
    } 
    
    if (searchQuery) {
      return `No cards matching "${searchQuery}" in your collection`;
    }
    
    return "No cards in your collection";
  };

  return (
    <div className="text-center py-8">
      <p className="text-muted-foreground">
        {getMessage()}
      </p>
    </div>
  );
};

export default NoSearchResults;
