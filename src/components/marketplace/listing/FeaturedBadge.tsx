
import React from "react";
import { Star } from "lucide-react";

const FeaturedBadge = () => {
  return (
    <div className="bg-amber-400 dark:bg-amber-500 text-primary-foreground px-3 py-1 text-xs font-medium flex items-center justify-center shadow-sm">
      <Star className="h-3 w-3 mr-1 fill-current" /> Featured Listing
    </div>
  );
};

export default FeaturedBadge;
