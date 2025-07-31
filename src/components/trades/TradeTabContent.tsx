
import React from "react";
import { TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import TradeEmptyState from "./TradeEmptyState";

interface TradeTabContentProps {
  value: "active" | "completed" | "declined";
  onCreateTrade?: () => void;
  trades?: any[];
  currentUserId?: string;
}

const TradeTabContent = ({ value, onCreateTrade, trades = [], currentUserId }: TradeTabContentProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'proposed': return 'bg-blue-500';
      case 'accepted': return 'bg-green-500';
      case 'processing': return 'bg-yellow-500';
      case 'shipped': return 'bg-purple-500';
      case 'completed': return 'bg-green-600';
      case 'declined': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getTradePartner = (trade: any) => {
    if (trade.initiator_user_id === currentUserId) {
      return trade.recipient_profile;
    }
    return trade.initiator_profile;
  };

  return (
    <TabsContent value={value} className="space-y-6">
      {trades.length === 0 ? (
        <TradeEmptyState type={value} onCreateTrade={onCreateTrade} />
      ) : (
        <div className="space-y-4">
          {trades.map((trade) => {
            const partner = getTradePartner(trade);
            const isInitiator = trade.initiator_user_id === currentUserId;
            
            return (
              <Card key={trade.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={partner?.avatar_url} />
                        <AvatarFallback>
                          {(partner?.display_name || partner?.username || 'U').substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base">
                          {partner?.display_name || partner?.username || 'Unknown User'}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {isInitiator ? 'You proposed' : 'Proposed to you'} • {formatDistanceToNow(new Date(trade.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <Badge className={`${getStatusColor(trade.status)} text-white`}>
                      {trade.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {trade.description && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {trade.description}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Your Cards:</span>
                      <div className="text-muted-foreground">
                        {isInitiator 
                          ? JSON.parse(trade.initiator_cards || '[]').length 
                          : JSON.parse(trade.recipient_cards || '[]').length
                        } cards (£{isInitiator ? trade.initiator_value : trade.recipient_value})
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">Their Cards:</span>
                      <div className="text-muted-foreground">
                        {isInitiator 
                          ? JSON.parse(trade.recipient_cards || '[]').length 
                          : JSON.parse(trade.initiator_cards || '[]').length
                        } cards (£{isInitiator ? trade.recipient_value : trade.initiator_value})
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </TabsContent>
  );
};

export default TradeTabContent;
