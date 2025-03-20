
import React from "react";
import GlassCard from "@/components/ui/custom/GlassCard";

interface TradeStatsProps {
  totalTrades: number;
  pendingCount: number;
  inProgressCount: number;
  completedCount: number;
}

const TradeStats = ({ 
  totalTrades, 
  pendingCount, 
  inProgressCount, 
  completedCount 
}: TradeStatsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <GlassCard className="p-4 text-center">
        <div className="text-3xl font-bold mb-1">
          {totalTrades}
        </div>
        <div className="text-sm text-muted-foreground">Total Trades</div>
      </GlassCard>
      
      <GlassCard className="p-4 text-center">
        <div className="text-3xl font-bold text-blue-500 mb-1">
          {pendingCount}
        </div>
        <div className="text-sm text-muted-foreground">Pending</div>
      </GlassCard>
      
      <GlassCard className="p-4 text-center">
        <div className="text-3xl font-bold text-yellow-500 mb-1">
          {inProgressCount}
        </div>
        <div className="text-sm text-muted-foreground">In Progress</div>
      </GlassCard>
      
      <GlassCard className="p-4 text-center">
        <div className="text-3xl font-bold text-green-500 mb-1">
          {completedCount}
        </div>
        <div className="text-sm text-muted-foreground">Completed</div>
      </GlassCard>
    </div>
  );
};

export default TradeStats;
