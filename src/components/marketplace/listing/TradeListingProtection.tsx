import React from "react";
import { Shield } from "lucide-react";

const TradeListingProtection = () => (
  <div className="px-4 pb-3 pt-0 flex items-center justify-center">
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <Shield className="h-3 w-3" />
      <span>Card-for-card trade · both sides confirm receipt</span>
    </div>
  </div>
);

export default TradeListingProtection;
