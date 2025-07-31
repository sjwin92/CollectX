
import React from "react";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import Badge from "@/components/ui/custom/Badge";
import TradeTabContent from "./TradeTabContent";

interface TradeTabsProps {
  pendingCount: number;
  inProgressCount: number;
  completedCount: number;
  declinedCount: number;
  onCreateTrade: () => void;
  trades?: any[];
  currentUserId?: string;
}

const TradeTabs = ({ 
  pendingCount, 
  inProgressCount, 
  completedCount, 
  declinedCount,
  onCreateTrade,
  trades = [],
  currentUserId
}: TradeTabsProps) => {
  return (
    <Tabs defaultValue="active">
      <TabsList className="mb-6">
        <TabsTrigger value="active">
          Active
          <Badge variant="default" className="ml-2">
            {pendingCount + inProgressCount}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="completed">
          Completed
          <Badge variant="default" className="ml-2">
            {completedCount}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="declined">
          Declined
          <Badge variant="default" className="ml-2">
            {declinedCount}
          </Badge>
        </TabsTrigger>
      </TabsList>
      
      <TradeTabContent 
        value="active" 
        onCreateTrade={onCreateTrade} 
        trades={trades?.filter(t => ['proposed', 'accepted', 'processing', 'shipped'].includes(t.status))} 
        currentUserId={currentUserId}
      />
      <TradeTabContent 
        value="completed" 
        trades={trades?.filter(t => t.status === 'completed')} 
        currentUserId={currentUserId}
      />
      <TradeTabContent 
        value="declined" 
        trades={trades?.filter(t => t.status === 'declined')} 
        currentUserId={currentUserId}
      />
    </Tabs>
  );
};

export default TradeTabs;
