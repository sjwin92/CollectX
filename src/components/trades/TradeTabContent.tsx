
import React from "react";
import { TabsContent } from "@/components/ui/tabs";
import TradeEmptyState from "./TradeEmptyState";

interface TradeTabContentProps {
  value: "active" | "completed" | "declined";
  onCreateTrade?: () => void;
}

const TradeTabContent = ({ value, onCreateTrade }: TradeTabContentProps) => {
  return (
    <TabsContent value={value} className="space-y-6">
      <TradeEmptyState type={value} onCreateTrade={onCreateTrade} />
    </TabsContent>
  );
};

export default TradeTabContent;
