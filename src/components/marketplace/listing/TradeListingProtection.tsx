import React from "react";
import { Shield } from "lucide-react";

interface TradeListingProtectionProps {
  listingType?: 'trade' | 'sale';
}

const TradeListingProtection = ({ listingType = 'trade' }: TradeListingProtectionProps) => (
  <div className="px-4 pb-3 pt-0 flex items-center justify-center">
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <Shield className="h-3 w-3" />
      <span>
        {listingType === 'sale'
          ? 'Buyer protection · payment held until delivery is confirmed'
          : 'Card-for-card trade · both sides confirm receipt'}
      </span>
    </div>
  </div>
);

export default TradeListingProtection;
