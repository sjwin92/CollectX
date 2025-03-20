
import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface TradeActionsProps {
  isRefreshing: boolean;
  setIsRefreshing: (value: boolean) => void;
}

const TradeActions = ({ isRefreshing, setIsRefreshing }: TradeActionsProps) => {
  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate refresh with timeout
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("Trades refreshed successfully!");
    }, 1500);
  };

  const handleCreateTrade = () => {
    toast.info("This feature is coming soon!");
    // You would typically navigate to a create trade form
    // navigate('/trades/create');
  };
  
  return (
    <div className="flex justify-between items-center mb-6">
      <Button className="gap-2" onClick={handleCreateTrade}>
        <Plus className="h-4 w-4" />
        Create New Trade
      </Button>
      
      <Button 
        variant="ghost" 
        size="sm" 
        className="gap-2" 
        onClick={handleRefresh}
        disabled={isRefreshing}
      >
        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        {isRefreshing ? 'Refreshing...' : 'Refresh'}
      </Button>
    </div>
  );
};

export default TradeActions;
