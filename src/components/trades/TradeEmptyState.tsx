
import React from "react";
import GlassCard from "@/components/ui/custom/GlassCard";
import { Button } from "@/components/ui/button";
import { HandshakeIcon } from "lucide-react";

interface TradeEmptyStateProps {
  type: "active" | "completed" | "declined";
  onCreateTrade?: () => void;
}

const TradeEmptyState = ({ type, onCreateTrade }: TradeEmptyStateProps) => {
  const renderContent = () => {
    switch (type) {
      case "active":
        return (
          <>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <HandshakeIcon className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-medium mb-2">No active trades</h3>
            <p className="text-muted-foreground mb-4">
              You don't have any active trades at the moment. 
              Start by creating a new trade proposal.
            </p>
            {onCreateTrade && <Button onClick={onCreateTrade}>Create New Trade</Button>}
          </>
        );
      case "completed":
        return (
          <>
            <h3 className="text-xl font-medium mb-2">No completed trades</h3>
            <p className="text-muted-foreground mb-4">
              You haven't completed any trades yet. 
              Complete one of your active trades to see it here.
            </p>
          </>
        );
      case "declined":
        return (
          <>
            <h3 className="text-xl font-medium mb-2">No declined trades</h3>
            <p className="text-muted-foreground">
              You don't have any declined trades.
            </p>
          </>
        );
    }
  };

  return (
    <GlassCard className="p-8 text-center">
      {renderContent()}
    </GlassCard>
  );
};

export default TradeEmptyState;
