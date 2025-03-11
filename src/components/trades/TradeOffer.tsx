import React from "react";
import { Link, useNavigate } from "react-router-dom";
import GlassCard from "@/components/ui/custom/GlassCard";
import Badge, { ReputationLevel } from "@/components/ui/custom/Badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeftRight, Calendar, Package, Shield, Truck, Lock, AlertTriangle, ExternalLink } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { useToast } from "@/hooks/use-toast";

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
  showFooter?: boolean;
}

const TradeOffer = ({
  id,
  status,
  date,
  user,
  giving,
  receiving,
  escrowRequired = false,
  escrowPaid = false,
  showFooter = true,
}: TradeOfferProps) => {
  const { isSignedIn } = useUser();
  const navigate = useNavigate();
  const { toast } = useToast();

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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(value);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.target as HTMLImageElement;
    img.onerror = null; // Prevent infinite loop
    img.src = "https://archives.bulbagarden.net/media/upload/1/17/Cardback.jpg";
  };

  const handleViewTradeDetails = () => {
    if (!isSignedIn) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to view trade details.",
        variant: "destructive"
      });
      navigate("/auth");
      return;
    }
    navigate(`/trades/${id}`);
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
              <img 
                src={giving.preview} 
                alt="Cards preview" 
                className="object-cover h-full w-full"
                onError={handleImageError}
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
              <img 
                src={receiving.preview} 
                alt="Cards preview" 
                className="object-cover h-full w-full"
                onError={handleImageError}
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

      {escrowRequired && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium text-amber-800">Escrow Protection</span>
          </div>
          <div className="text-xs text-amber-700 mt-1">
            {escrowPaid ? (
              <div className="flex items-center gap-1">
                <Lock className="h-3 w-3" />
                <span>Escrow has been paid and the trade is protected</span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                <span>Escrow payment required to proceed with this trade</span>
              </div>
            )}
          </div>
        </div>
      )}

      {status === "shipped" && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium text-blue-800">Shipping Status</span>
          </div>
          <div className="text-xs text-blue-700 mt-1">
            This trade is currently in transit. Tracking information is available in trade details.
          </div>
        </div>
      )}
      
      {showFooter && (
        <div className="flex justify-end mt-4 pt-3 border-t border-border">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-1"
            onClick={handleViewTradeDetails}
          >
            View Details <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </GlassCard>
  );
};

export default TradeOffer;
