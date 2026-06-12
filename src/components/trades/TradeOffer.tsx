import React from "react";
import { Link } from "react-router-dom";
import GlassCard from "@/components/ui/custom/GlassCard";
import Badge, { ReputationLevel } from "@/components/ui/custom/Badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeftRight, Calendar, Package, Shield, Truck, Lock, AlertTriangle } from "lucide-react";
import { SmartImage } from "@/components/common/SmartImage";

export interface TradeOfferProps {
  id: string;
  status: "proposed" | "accepted" | "processing" | "escrowed" | "shipped" | "completed" | "declined" | "disputed" | "cancelled" | "pending";
  date: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
    reputation: ReputationLevel;
  };
  giving: {
    count: number;
    preview: string;
    totalValue?: number;
    currency?: string;
  };
  receiving: {
    count: number;
    preview: string;
    totalValue?: number;
    currency?: string;
  };
  escrowRequired?: boolean;
  escrowPaid?: boolean;
}

const TradeListing = ({
  id,
  status,
  date,
  user,
  giving,
  receiving,
  escrowRequired = false,
  escrowPaid = false,
}: TradeOfferProps) => {
  const getStatusBadge = () => {
    switch (status) {
      case "proposed":
        return <Badge variant="warning">Proposed</Badge>;
      case "accepted":
        return <Badge variant="info">Accepted</Badge>;
      case "processing":
        return <Badge variant="info">Processing</Badge>;
      case "escrowed":
        return <Badge variant="info">Escrowed</Badge>;
      case "shipped":
        return <Badge variant="info">Shipped</Badge>;
      case "completed":
        return <Badge variant="success">Completed</Badge>;
      case "declined":
        return <Badge variant="danger">Declined</Badge>;
      case "disputed":
        return <Badge variant="danger">Disputed</Badge>;
      case "cancelled":
        return <Badge variant="danger">Cancelled</Badge>;
      case "pending":
        return <Badge variant="warning">Pending</Badge>;
    }
  };

  const getStatusStep = () => {
    switch (status) {
      case "proposed":
      case "pending":
        return 1;
      case "accepted":
      case "processing":
        return 2;
      case "escrowed":
        return 3;
      case "shipped":
        return 4;
      case "completed":
        return 5;
      case "declined":
      case "disputed":
      case "cancelled":
        return 0;
    }
  };

  const step = getStatusStep();

  const formatCurrency = (value?: number, currency?: string): string => {
    if (value === undefined) return "";
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency || 'GBP'
    }).format(value);
  };

  return (
    <GlassCard className="overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{user.name}</span>
              <Badge variant="reputation" reputation={user.reputation} size="sm">
                {user.reputation.charAt(0).toUpperCase() + user.reputation.slice(1)}
              </Badge>
            </div>
            <div className="flex items-center text-xs text-muted-foreground gap-1 mt-0.5">
              <Calendar className="h-3 w-3" />
              <span>{date}</span>
            </div>
          </div>
        </div>
        <div>{getStatusBadge()}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
        <div className="col-span-2">
          <div className="text-xs text-muted-foreground mb-1">You're giving:</div>
          <div className="flex items-center gap-2">
            <div className="relative h-14 w-14 rounded-md overflow-hidden bg-muted">
              <SmartImage
                src={giving.preview}
                alt="Cards preview"
                className="object-cover h-full w-full"
              />
              {giving.count > 1 && (
                <div className="absolute top-0.5 right-0.5 bg-primary/90 text-white text-[10px] font-medium h-4 w-4 rounded-full flex items-center justify-center">
                  {giving.count}
                </div>
              )}
            </div>
            <div>
              <Package className="h-4 w-4 text-muted-foreground mb-1" />
              {giving.totalValue !== undefined && (
                <div className="text-xs font-medium">
                  {formatCurrency(giving.totalValue, giving.currency)}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="col-span-1 flex items-center justify-center">
          <ArrowLeftRight className="h-5 w-5 text-muted-foreground" />
        </div>
        
        <div className="col-span-2">
          <div className="text-xs text-muted-foreground mb-1">You're receiving:</div>
          <div className="flex items-center gap-2">
            <div className="relative h-14 w-14 rounded-md overflow-hidden bg-muted">
              <SmartImage
                src={receiving.preview}
                alt="Cards preview"
                className="object-cover h-full w-full"
              />
              {receiving.count > 1 && (
                <div className="absolute top-0.5 right-0.5 bg-primary/90 text-white text-[10px] font-medium h-4 w-4 rounded-full flex items-center justify-center">
                  {receiving.count}
                </div>
              )}
            </div>
            <div>
              <Package className="h-4 w-4 text-muted-foreground mb-1" />
              {receiving.totalValue !== undefined && (
                <div className="text-xs font-medium">
                  {formatCurrency(receiving.totalValue, receiving.currency)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Escrow Status (if applicable) */}
      {escrowRequired && (
        <div className="mb-4 p-3 rounded-md border border-border bg-secondary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Escrow Protection</span>
            </div>
            {escrowPaid ? (
              <Badge variant="success" size="sm">Paid</Badge>
            ) : (
              <Badge variant="warning" size="sm">Required</Badge>
            )}
          </div>
        </div>
      )}

      {/* Progress tracker */}
      {!["declined", "disputed", "cancelled"].includes(status) && (
        <div className="relative mb-6 mt-6">
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-muted transform -translate-y-1/2" />
          <div 
            className="absolute top-1/2 left-0 h-1 bg-primary transform -translate-y-1/2" 
            style={{ width: `${(step / 5) * 100}%` }}
          />
          <div className="relative flex justify-between">
            <div className="flex flex-col items-center">
              <div className={`h-6 w-6 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-muted'} flex items-center justify-center text-white text-xs`}>
                1
              </div>
              <span className="text-xs mt-1">Proposed</span>
            </div>
            <div className="flex flex-col items-center">
              <div className={`h-6 w-6 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-muted'} flex items-center justify-center text-white text-xs`}>
                2
              </div>
              <span className="text-xs mt-1">Accepted</span>
            </div>
            <div className="flex flex-col items-center">
              <div className={`h-6 w-6 rounded-full ${step >= 3 ? 'bg-primary' : 'bg-muted'} flex items-center justify-center text-white text-xs`}>
                3
              </div>
              <span className="text-xs mt-1">Escrowed</span>
            </div>
            <div className="flex flex-col items-center">
              <div className={`h-6 w-6 rounded-full ${step >= 4 ? 'bg-primary' : 'bg-muted'} flex items-center justify-center text-white text-xs`}>
                4
              </div>
              <span className="text-xs mt-1">Shipped</span>
            </div>
            <div className="flex flex-col items-center">
              <div className={`h-6 w-6 rounded-full ${step >= 5 ? 'bg-primary' : 'bg-muted'} flex items-center justify-center text-white text-xs`}>
                5
              </div>
              <span className="text-xs mt-1">Completed</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Shield className="h-4 w-4" />
          <span>Trade Protected</span>
        </div>
        <Link to={`/trades/${id}`}>
          <Button size="sm">View Details</Button>
        </Link>
      </div>
    </GlassCard>
  );
};

export default TradeListing;
