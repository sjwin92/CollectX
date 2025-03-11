
import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Badge from "@/components/ui/custom/Badge";
import GlassCard from "@/components/ui/custom/GlassCard";
import {
  ArrowLeftRight,
  Calendar as CalendarIcon,
  Package,
  Shield,
  Truck,
  Lock,
  AlertTriangle,
  Copy,
  CheckCircle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  MessageSquare,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { formatCurrency } from "@/utils/escrowCalculator";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  getTradeProposal,
  addTradeMessage,
  acceptTradeProposal,
  declineTradeProposal,
  payInitiatorEscrow,
  payRecipientEscrow,
  releaseTradeEscrow,
  updateShippingInfo,
} from "@/services/tradeService";
import { TradeStatus, TradeProposal } from "@/models/escrow";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { format } from 'date-fns';
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useUser } from "@/hooks/useUser";

interface TradeDetailProps {}

const TradeDetail: React.FC<TradeDetailProps> = () => {
  const { tradeId } = useParams<{ tradeId: string }>();
  const { toast } = useToast();
  const { user } = useUser();
  const [newMessage, setNewMessage] = useState("");
  const [shippingCarrier, setShippingCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [estimatedDelivery, setEstimatedDelivery] = useState<Date | undefined>(undefined);
  const [isShippingEditMode, setIsShippingEditMode] = useState(false);

  const {
    data: trade,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["trade", tradeId],
    queryFn: () => getTradeProposal(tradeId!),
    enabled: !!tradeId,
    refetchOnMount: true,
  });

  const {
    mutate: sendMessage,
    isPending: isSendingMessage,
    isError: isSendMessageError,
  } = useMutation({
    mutationFn: (message: string) => addTradeMessage(tradeId!, message),
    onSuccess: () => {
      setNewMessage("");
      refetch();
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "There was a problem sending your message.",
      });
    },
  });

  const {
    mutate: acceptTrade,
    isPending: isAcceptingTrade,
    isError: isAcceptTradeError,
  } = useMutation({
    mutationFn: () => acceptTradeProposal(tradeId!),
    onSuccess: () => {
      toast({
        title: "Trade Accepted",
        description: "You have accepted the trade proposal.",
      });
      refetch();
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "There was a problem accepting the trade proposal.",
      });
    },
  });

  const {
    mutate: declineTrade,
    isPending: isDecliningTrade,
    isError: isDeclineTradeError,
  } = useMutation({
    mutationFn: () => declineTradeProposal(tradeId!),
    onSuccess: () => {
      toast({
        title: "Trade Declined",
        description: "You have declined the trade proposal.",
      });
      refetch();
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "There was a problem declining the trade proposal.",
      });
    },
  });

  const {
    mutate: payInitiator,
    isPending: isPayingInitiator,
    isError: isPayInitiatorError,
  } = useMutation({
    mutationFn: () => payInitiatorEscrow(tradeId!),
    onSuccess: () => {
      toast({
        title: "Escrow Paid",
        description: "You have paid the escrow amount.",
      });
      refetch();
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "There was a problem paying the escrow amount.",
      });
    },
  });

  const {
    mutate: payRecipient,
    isPending: isPayingRecipient,
    isError: isPayRecipientError,
  } = useMutation({
    mutationFn: () => payRecipientEscrow(tradeId!),
    onSuccess: () => {
      toast({
        title: "Escrow Paid",
        description: "You have paid the escrow amount.",
      });
      refetch();
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "There was a problem paying the escrow amount.",
      });
    },
  });

  const {
    mutate: releaseEscrow,
    isPending: isReleasingEscrow,
    isError: isReleaseEscrowError,
  } = useMutation({
    mutationFn: () => releaseTradeEscrow(tradeId!),
    onSuccess: () => {
      toast({
        title: "Escrow Released",
        description: "You have released the escrow amount.",
      });
      refetch();
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "There was a problem releasing the escrow amount.",
      });
    },
  });

  const {
    mutate: updateShipping,
    isPending: isUpdatingShipping,
    isError: isUpdateShippingError,
  } = useMutation({
    mutationFn: () => updateShippingInfo(tradeId!, shippingCarrier, trackingNumber, estimatedDelivery),
    onSuccess: () => {
      toast({
        title: "Shipping Info Updated",
        description: "You have updated the shipping information.",
      });
      refetch();
      setIsShippingEditMode(false);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "There was a problem updating the shipping information.",
      });
    },
  });

  const getStatusBadge = (status: TradeStatus) => {
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
      default:
        return <Badge variant="default">Unknown</Badge>;
    }
  };

  const getStatusStep = (status: TradeStatus) => {
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
      default:
        return 0;
    }
  };

  const step = trade ? getStatusStep(trade.status) : 0;

  const isInitiator = trade?.initiator.userId === user?.id;
  const isRecipient = trade?.recipient.userId === user?.id;

  const canAccept =
    trade?.status === "proposed" && trade?.recipient.userId === user?.id;
  const canDecline =
    trade?.status === "proposed" && trade?.recipient.userId === user?.id;
  const canPayInitiator =
    trade?.status === "accepted" &&
    isInitiator &&
    !trade.escrow?.initiatorPaid;
  const canPayRecipient =
    trade?.status === "accepted" &&
    isRecipient &&
    !trade.escrow?.recipientPaid;
  const canReleaseEscrow =
    trade?.status === "shipped" && isRecipient;

  const showShippingInfo = trade?.status === "escrowed" || trade?.status === "shipped" || trade?.status === "completed";

  if (isLoading) {
    return <div>Loading trade details...</div>;
  }

  if (isError || !trade) {
    return <div>Error loading trade details.</div>;
  }

  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: message,
    });
  };

  return (
    <div className="container py-12">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/trades" className="text-muted-foreground hover:underline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Trades
          </Link>
          <h1 className="text-2xl font-bold">Trade Details</h1>
        </div>
        <div>{getStatusBadge(trade.status)}</div>
      </div>

      <GlassCard className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Initiator */}
          <div>
            <div className="text-xs text-muted-foreground mb-1">
              You're giving:
            </div>
            <div className="flex items-center gap-2">
              <div className="relative h-14 w-14 rounded-md overflow-hidden bg-muted">
                <img
                  src={trade.initiator.offeringCards[0].imageUrl}
                  alt="Cards preview"
                  className="object-cover h-full w-full"
                />
                {trade.initiator.offeringCards.length > 1 && (
                  <div className="absolute top-0.5 right-0.5 bg-primary/90 text-white text-[10px] font-medium h-4 w-4 rounded-full flex items-center justify-center">
                    {trade.initiator.offeringCards.length}
                  </div>
                )}
              </div>
              <div>
                <Package className="h-4 w-4 text-muted-foreground mb-1" />
                {trade.initiator.escrowAmount.finalAmount !== undefined && (
                  <div className="text-xs font-medium">
                    {formatCurrency(
                      trade.initiator.escrowAmount.finalAmount,
                      trade.initiator.escrowAmount.currency
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-2">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src="" alt={trade.initiator.username} />
                  <AvatarFallback>
                    {trade.initiator.username.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{trade.initiator.username}</span>
                    <Badge variant="reputation" reputation={trade.initiator.reputation} size="sm">
                      {trade.initiator.reputation.charAt(0).toUpperCase() +
                        trade.initiator.reputation.slice(1)}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recipient */}
          <div>
            <div className="text-xs text-muted-foreground mb-1">
              You're receiving:
            </div>
            <div className="flex items-center gap-2">
              <div className="relative h-14 w-14 rounded-md overflow-hidden bg-muted">
                <img
                  src={trade.recipient.offeringCards[0].imageUrl}
                  alt="Cards preview"
                  className="object-cover h-full w-full"
                />
                {trade.recipient.offeringCards.length > 1 && (
                  <div className="absolute top-0.5 right-0.5 bg-primary/90 text-white text-[10px] font-medium h-4 w-4 rounded-full flex items-center justify-center">
                    {trade.recipient.offeringCards.length}
                  </div>
                )}
              </div>
              <div>
                <Package className="h-4 w-4 text-muted-foreground mb-1" />
                {trade.recipient.escrowAmount.finalAmount !== undefined && (
                  <div className="text-xs font-medium">
                    {formatCurrency(
                      trade.recipient.escrowAmount.finalAmount,
                      trade.recipient.escrowAmount.currency
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-2">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src="" alt={trade.recipient.username} />
                  <AvatarFallback>
                    {trade.recipient.username.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{trade.recipient.username}</span>
                    <Badge variant="reputation" reputation={trade.recipient.reputation} size="sm">
                      {trade.recipient.reputation.charAt(0).toUpperCase() +
                        trade.recipient.reputation.slice(1)}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Escrow Status (if applicable) */}
      {trade.escrow && (
        <GlassCard className="mb-6">
          <div className="p-4">
            <h3 className="text-lg font-medium mb-2">Escrow Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">
                      Initiator Escrow (You)
                    </span>
                  </div>
                  {trade.escrow.initiatorPaid ? (
                    <Badge variant="success" size="sm">
                      Paid
                    </Badge>
                  ) : (
                    <Badge variant="warning" size="sm">
                      Pending
                    </Badge>
                  )}
                </div>
                <div className="text-sm">
                  Amount:{" "}
                  {formatCurrency(
                    trade.escrow.initiatorEscrowAmount.finalAmount,
                    trade.escrow.initiatorEscrowAmount.currency
                  )}
                </div>
                {!trade.escrow.initiatorPaid && canPayInitiator && (
                  <Button
                    size="sm"
                    onClick={() => payInitiator()}
                    disabled={isPayingInitiator}
                  >
                    {isPayingInitiator ? (
                      <>
                        Paying...
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      </>
                    ) : (
                      "Pay Escrow"
                    )}
                  </Button>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">
                      Recipient Escrow
                    </span>
                  </div>
                  {trade.escrow.recipientPaid ? (
                    <Badge variant="success" size="sm">
                      Paid
                    </Badge>
                  ) : (
                    <Badge variant="warning" size="sm">
                      Pending
                    </Badge>
                  )}
                </div>
                <div className="text-sm">
                  Amount:{" "}
                  {formatCurrency(
                    trade.escrow.recipientEscrowAmount.finalAmount,
                    trade.escrow.recipientEscrowAmount.currency
                  )}
                </div>
                {!trade.escrow.recipientPaid && canPayRecipient && (
                  <Button
                    size="sm"
                    onClick={() => payRecipient()}
                    disabled={isPayingRecipient}
                  >
                    {isPayingRecipient ? (
                      <>
                        Paying...
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      </>
                    ) : (
                      "Pay Escrow"
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Shipping Information */}
      {showShippingInfo && (
        <GlassCard className="mb-6">
          <div className="p-4">
            <h3 className="text-lg font-medium mb-2">Shipping Information</h3>
            {isShippingEditMode ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="shippingCarrier">Shipping Carrier</Label>
                  <Input
                    id="shippingCarrier"
                    type="text"
                    value={shippingCarrier}
                    onChange={(e) => setShippingCarrier(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="trackingNumber">Tracking Number</Label>
                  <Input
                    id="trackingNumber"
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Estimated Delivery</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-[240px] justify-start text-left font-normal",
                          !estimatedDelivery && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {estimatedDelivery ? format(estimatedDelivery, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="center" side="bottom">
                      <Calendar
                        mode="single"
                        selected={estimatedDelivery}
                        onSelect={setEstimatedDelivery}
                        disabled={(date) =>
                          date < new Date()
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setIsShippingEditMode(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => updateShipping()} disabled={isUpdatingShipping}>
                    {isUpdatingShipping ? (
                      <>
                        Updating...
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      </>
                    ) : (
                      "Update Shipping"
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-sm">
                  Carrier: {trade.escrow.shippingInfo?.carrier || "N/A"}
                </div>
                <div className="text-sm">
                  Tracking Number: {trade.escrow.shippingInfo?.trackingNumber || "N/A"}
                  {trade.escrow.shippingInfo?.trackingNumber && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(trade.escrow.shippingInfo!.trackingNumber, "Tracking number copied to clipboard.")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="text-sm">
                  Estimated Delivery: {trade.escrow.shippingInfo?.estimatedDelivery ? format(new Date(trade.escrow.shippingInfo.estimatedDelivery), "PPP") : "N/A"}
                </div>
                {(isInitiator && trade.status === "escrowed") && (
                  <Button size="sm" onClick={() => {
                    setIsShippingEditMode(true);
                    setShippingCarrier(trade.escrow?.shippingInfo?.carrier || "");
                    setTrackingNumber(trade.escrow?.shippingInfo?.trackingNumber || "");
                    if (trade.escrow?.shippingInfo?.estimatedDelivery) {
                      setEstimatedDelivery(new Date(trade.escrow.shippingInfo.estimatedDelivery));
                    }
                  }}>
                    Edit Shipping Info
                  </Button>
                )}
              </div>
            )}
          </div>
        </GlassCard>
      )}

      {/* Progress tracker */}
      {!["declined", "disputed", "cancelled"].includes(trade.status) && (
        <GlassCard className="mb-6">
          <div className="relative p-6">
            <h3 className="text-lg font-medium mb-4">Trade Progress</h3>
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-muted transform -translate-y-1/2" />
            <div
              className="absolute top-1/2 left-0 h-1 bg-primary transform -translate-y-1/2"
              style={{ width: `${(step / 5) * 100}%` }}
            />
            <div className="relative flex justify-between">
              <div className="flex flex-col items-center">
                <div
                  className={`h-6 w-6 rounded-full ${step >= 1 ? "bg-primary" : "bg-muted"
                    } flex items-center justify-center text-white text-xs`}
                >
                  1
                </div>
                <span className="text-xs mt-1">Proposed</span>
              </div>
              <div className="flex flex-col items-center">
                <div
                  className={`h-6 w-6 rounded-full ${step >= 2 ? "bg-primary" : "bg-muted"
                    } flex items-center justify-center text-white text-xs`}
                >
                  2
                </div>
                <span className="text-xs mt-1">Accepted</span>
              </div>
              <div className="flex flex-col items-center">
                <div
                  className={`h-6 w-6 rounded-full ${step >= 3 ? "bg-primary" : "bg-muted"
                    } flex items-center justify-center text-white text-xs`}
                >
                  3
                </div>
                <span className="text-xs mt-1">Escrowed</span>
              </div>
              <div className="flex flex-col items-center">
                <div
                  className={`h-6 w-6 rounded-full ${step >= 4 ? "bg-primary" : "bg-muted"
                    } flex items-center justify-center text-white text-xs`}
                >
                  4
                </div>
                <span className="text-xs mt-1">Shipped</span>
              </div>
              <div className="flex flex-col items-center">
                <div
                  className={`h-6 w-6 rounded-full ${step >= 5 ? "bg-primary" : "bg-muted"
                    } flex items-center justify-center text-white text-xs`}
                >
                  5
                </div>
                <span className="text-xs mt-1">Completed</span>
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Action Buttons */}
      <GlassCard className="mb-6">
        <div className="flex items-center justify-around p-4">
          {canAccept && (
            <Button onClick={() => acceptTrade()} disabled={isAcceptingTrade}>
              {isAcceptingTrade ? (
                <>
                  Accepting...
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                </>
              ) : (
                "Accept Trade"
              )}
            </Button>
          )}
          {canDecline && (
            <Button
              variant="destructive"
              onClick={() => declineTrade()}
              disabled={isDecliningTrade}
            >
              {isDecliningTrade ? (
                <>
                  Declining...
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                </>
              ) : (
                "Decline Trade"
              )}
            </Button>
          )}
          {canReleaseEscrow && (
            <Button onClick={() => releaseEscrow()} disabled={isReleasingEscrow}>
              {isReleasingEscrow ? (
                <>
                  Releasing...
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                </>
              ) : (
                "Release Escrow"
              )}
            </Button>
          )}
        </div>
      </GlassCard>

      {/* Chat */}
      <GlassCard>
        <div className="p-4">
          <h3 className="text-lg font-medium mb-4">Trade Chat</h3>
          <ScrollArea className="h-[300px] mb-4">
            <div className="space-y-2">
              {trade.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-md ${msg.userId === user?.id
                    ? "bg-primary/10 text-right ml-auto w-fit max-w-[75%]"
                    : "bg-secondary/10 text-left mr-auto w-fit max-w-[75%]"
                    }`}
                >
                  <div className="text-xs text-muted-foreground">
                    {msg.userId === user?.id ? "You" : msg.username}
                  </div>
                  <div>{msg.message}</div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(msg.createdAt), "Pp")}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="flex items-center">
            <Input
              type="text"
              placeholder="Type your message here..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="mr-2"
            />
            <Button
              onClick={() => sendMessage(newMessage)}
              disabled={isSendingMessage}
            >
              {isSendingMessage ? (
                <>
                  Sending...
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                </>
              ) : (
                <>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Send
                </>
              )}
            </Button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

export default TradeDetail;
