
import React from "react";
import { TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import TradeEmptyState from "./TradeEmptyState";

interface TradeTabContentProps {
  value: "active" | "completed" | "cancelled";
  onCreateTrade?: () => void;
  trades?: any[];
  currentUserId?: string;
}

const STATUS_COLORS: Record<string, string> = {
  proposed: "bg-blue-500",
  accepted: "bg-green-500",
  shipped: "bg-purple-500",
  completed: "bg-green-600",
  disputed: "bg-red-600",
  cancelled: "bg-gray-500",
};

const parseCardArray = (raw: any): any[] => {
  if (!raw) return [];
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch { return []; }
  }
  return Array.isArray(raw) ? raw : [];
};

const TradeTabContent = ({ value, onCreateTrade, trades = [], currentUserId }: TradeTabContentProps) => {
  const getTradePartner = (trade: any) => {
    return trade.initiator_user_id === currentUserId
      ? trade.recipient_profile
      : trade.initiator_profile;
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

            const myCards = parseCardArray(isInitiator ? trade.initiator_cards : trade.recipient_cards);
            const theirCards = parseCardArray(isInitiator ? trade.recipient_cards : trade.initiator_cards);
            const sumQty = (arr: any[]) =>
              arr.reduce((n, c) => n + (Number(c?.quantity) > 0 ? Number(c.quantity) : 1), 0);
            const myQty = sumQty(myCards);
            const theirQty = sumQty(theirCards);

            return (
              <Card key={trade.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={partner?.avatar_url} />
                        <AvatarFallback>
                          {(partner?.display_name || partner?.username || "U").substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base">
                          {partner?.display_name || partner?.username || "Unknown User"}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {isInitiator ? "You proposed" : "Proposed to you"} •{" "}
                          {formatDistanceToNow(new Date(trade.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`${STATUS_COLORS[trade.status] || "bg-gray-500"} text-white capitalize`}>
                        {trade.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {trade.description && (
                    <p className="text-sm text-muted-foreground mb-3">{trade.description}</p>
                  )}
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <span className="font-medium">Your Cards:</span>
                      <div className="text-muted-foreground">
                        {myCards.length} card{myCards.length !== 1 ? "s" : ""}
                        {myValue > 0 && ` (£${Number(myValue).toFixed(2)})`}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">Their Cards:</span>
                      <div className="text-muted-foreground">
                        {theirCards.length} card{theirCards.length !== 1 ? "s" : ""}
                        {theirValue > 0 && ` (£${Number(theirValue).toFixed(2)})`}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/trades/${trade.id}`}>
                        View Trade
                        <ArrowRight className="ml-2 h-3 w-3" />
                      </Link>
                    </Button>
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
