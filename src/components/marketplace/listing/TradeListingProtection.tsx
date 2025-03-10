
import React from "react";
import { Shield } from "lucide-react";

const TradeListingProtection = () => {
  return (
    <div className="px-4 pb-3 pt-0 flex items-center justify-center">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Shield className="h-3 w-3" />
        <span>Protected by CollectX Escrow</span>
      </div>
    </div>
  );
};

export default TradeListingProtection;
