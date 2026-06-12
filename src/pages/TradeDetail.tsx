
import React, { useState, useRef, useEffect } from "react";
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
import OptimizedImage from "@/components/ui/OptimizedImage";
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
  Image,
  X,
  Paperclip,
  SendHorizontal,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { formatCurrency } from "@/utils/escrowCalculator";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  getTradeMessages,
  sendTradeMessage,
  updateTradeStatus,
  uploadTradeImage,
} from "@/services/supabaseTradeService";
import {
  getEscrowByTradeId,
  updateEscrowPayment,
  releaseEscrowFunds,
  createEscrowTransaction,
  EscrowTransaction,
} from "@/services/supabaseEscrowService";
import { TradeStatus, TradeProposal, TradeEscrow, TradeAmount, TradeCard, Currency, UserReputation } from "@/models/escrow";
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
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useUser } from "@/hooks/useUser";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import EscrowDetails from "@/components/trades/EscrowDetails";

// ─── Helpers ────────────────────────────────────────────────────────────────

const getRepTier = (score: number | null): UserReputation => {
  if (!score || score < 10) return "new";
  if (score < 25) return "starter";
  if (score < 50) return "established";
  if (score < 75) return "trusted";
  return "elite";
};

const makeTradeAmount = (amount: number): TradeAmount => ({
  baseAmount: amount,
  reputationDiscount: 0,
  finalAmount: amount,
  currency: "GBP" as Currency,
});

const parseCards = (raw: any): any[] => {
  if (!raw) return [];
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch { return []; }
  }
  return Array.isArray(raw) ? raw : [];
};

const mapToTradeCards = (cards: any[]): TradeCard[] =>
  cards.map((c) => ({
    id: c.id || c.card_id || "",
    name: c.card_name || c.name || "Unknown Card",
    imageUrl: c.imageUrl || c.image_url || "",
    condition: c.condition || "Unknown",
    estimatedValue: parseFloat(c.estimatedValue || c.trade_value || "0"),
    currency: "GBP" as Currency,
  }));

const mapEscrowDisplayStatus = (
  escrow: EscrowTransaction,
  tradeStatus: string
): TradeStatus => {
  if (escrow.status === "completed" || tradeStatus === "completed") return "completed";
  // 'processing' is used as our proxy for "receipt confirmed, awaiting release"
  if (tradeStatus === "processing" && escrow.status === "escrowed") return "received";
  if (tradeStatus === "shipped") return "shipped";
  if (escrow.status === "escrowed") return "escrowed";
  return "accepted";
};

const buildTradeProposal = (
  tradeRow: any,
  escrow: EscrowTransaction | null,
  messages: any[]
): TradeProposal => {
  const initiatorCards = parseCards(tradeRow.initiator_cards);
  const recipientCards = parseCards(tradeRow.recipient_cards);

  const tradeEscrow: TradeEscrow | null = escrow
    ? {
        id: escrow.id,
        tradeId: escrow.trade_id,
        status: mapEscrowDisplayStatus(escrow, tradeRow.status),
        initiatorId: escrow.initiator_user_id,
        recipientId: escrow.recipient_user_id,
        initiatorEscrowAmount: makeTradeAmount(escrow.initiator_escrow_amount),
        recipientEscrowAmount: makeTradeAmount(escrow.recipient_escrow_amount),
        initiatorPaid: escrow.initiator_paid,
        recipientPaid: escrow.recipient_paid,
        createdAt: escrow.created_at,
        updatedAt: escrow.updated_at,
        completedAt: escrow.completed_at,
        releaseCode: escrow.release_code,
      }
    : null;

  return {
    id: tradeRow.id,
    status: tradeRow.status as TradeStatus,
    createdAt: tradeRow.created_at,
    updatedAt: tradeRow.updated_at,
    initiator: {
      userId: tradeRow.initiator_user_id,
      username:
        tradeRow.initiator_profile?.display_name ||
        tradeRow.initiator_profile?.username ||
        "Unknown",
      reputation: getRepTier(tradeRow.initiator_profile?.reputation_score),
      tradeCount: tradeRow.initiator_profile?.total_trades || 0,
      successRate: tradeRow.initiator_profile?.total_trades
        ? (tradeRow.initiator_profile.successful_trades /
            tradeRow.initiator_profile.total_trades) *
          100
        : 0,
      offeringCards: mapToTradeCards(initiatorCards),
      escrowAmount: escrow
        ? makeTradeAmount(escrow.initiator_escrow_amount)
        : makeTradeAmount(0),
    },
    recipient: {
      userId: tradeRow.recipient_user_id,
      username:
        tradeRow.recipient_profile?.display_name ||
        tradeRow.recipient_profile?.username ||
        "Unknown",
      reputation: getRepTier(tradeRow.recipient_profile?.reputation_score),
      tradeCount: tradeRow.recipient_profile?.total_trades || 0,
      successRate: tradeRow.recipient_profile?.total_trades
        ? (tradeRow.recipient_profile.successful_trades /
            tradeRow.recipient_profile.total_trades) *
          100
        : 0,
      offeringCards: mapToTradeCards(recipientCards),
      escrowAmount: escrow
        ? makeTradeAmount(escrow.recipient_escrow_amount)
        : makeTradeAmount(0),
    },
    escrow: tradeEscrow,
    messages: messages.map((m) => ({
      id: m.id,
      tradeId: m.trade_id,
      userId: m.user_id,
      username:
        m.user_id === tradeRow.initiator_user_id
          ? tradeRow.initiator_profile?.display_name || "User"
          : tradeRow.recipient_profile?.display_name || "User",
      message: m.message,
      createdAt: m.created_at,
      systemMessage: m.message_type === "system",
      imageUrl: m.image_url || null,
    })),
  };
};

// ─── Component ──────────────────────────────────────────────────────────────

const TradeDetail: React.FC = () => {
  const { tradeId } = useParams<{ tradeId: string }>();
  const { toast } = useToast();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const [shippingCarrier, setShippingCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [estimatedDelivery, setEstimatedDelivery] = useState<Date | undefined>(undefined);
  const [isShippingEditMode, setIsShippingEditMode] = useState(false);
  const [isUpdatingShipping, setIsUpdatingShipping] = useState(false);

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isShowingLightbox, setIsShowingLightbox] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Main query: fetch trade + escrow + messages from Supabase ──────────────
  const {
    data: trade,
    isLoading,
    isError,
    refetch,
  } = useQuery<TradeProposal>({
    queryKey: ["trade", tradeId],
    queryFn: async () => {
      if (!tradeId) throw new Error("No trade ID");

      const [tradeResult, escrow, messages] = await Promise.all([
        (supabase as any)
          .from("trades")
          .select(
            `*, initiator_profile:profiles!trades_initiator_user_id_fkey(display_name, username, avatar_url, reputation_score, successful_trades, total_trades), recipient_profile:profiles!trades_recipient_user_id_fkey(display_name, username, avatar_url, reputation_score, successful_trades, total_trades)`
          )
          .eq("id", tradeId)
          .single(),
        getEscrowByTradeId(tradeId),
        getTradeMessages(tradeId),
      ]);

      if (tradeResult.error) throw tradeResult.error;
      return buildTradeProposal(tradeResult.data, escrow, messages);
    },
    enabled: !!tradeId,
    refetchOnMount: true,
  });

  // ── Real-time subscription for new messages ────────────────────────────────
  useEffect(() => {
    if (!tradeId) return;
    const channel = (supabase as any)
      .channel(`trade-messages-${tradeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "trade_messages", filter: `trade_id=eq.${tradeId}` },
        () => refetch()
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "trades", filter: `id=eq.${tradeId}` },
        () => refetch()
      )
      .subscribe();
    return () => (supabase as any).removeChannel(channel);
  }, [tradeId, refetch]);

  // ── Image upload ────────────────────────────────────────────────────────────
  const { mutate: uploadImage, isPending: isUploadingImage } = useMutation({
    mutationFn: (file: File) => uploadTradeImage(file),
    onSuccess: (imageUrl) => {
      const msg = newMessage.trim() || "I've shared an image with you.";
      sendMessageMutation({ message: msg, imageUrl });
      setSelectedImage(null);
      setImagePreview(null);
    },
    onError: () => {
      toast({ variant: "destructive", title: "Upload failed", description: "There was a problem uploading your image." });
    },
  });

  // ── Send message ────────────────────────────────────────────────────────────
  const { mutate: sendMessageMutation, isPending: isSendingMessage } = useMutation({
    mutationFn: ({ message, imageUrl }: { message: string; imageUrl: string | null }) =>
      sendTradeMessage(tradeId!, message, "text"),
    onSuccess: () => {
      setNewMessage("");
      refetch();
    },
    onError: () => {
      toast({ variant: "destructive", title: "Send failed", description: "There was a problem sending your message." });
    },
  });

  const sendMessage = (message: string, imageUrl: string | null = null) => {
    sendMessageMutation({ message, imageUrl });
  };

  // ── Accept trade ────────────────────────────────────────────────────────────
  const { mutate: acceptTrade, isPending: isAcceptingTrade } = useMutation({
    mutationFn: async () => {
      await updateTradeStatus(tradeId!, "accepted");
      // Create escrow transaction when trade is accepted
      const tradeRow = await (supabase as any)
        .from("trades")
        .select("initiator_user_id, recipient_user_id, initiator_value, recipient_value, escrow_required")
        .eq("id", tradeId)
        .single();
      if (!tradeRow.error && tradeRow.data) {
        const { initiator_user_id, recipient_user_id, initiator_value, recipient_value } = tradeRow.data;
        await createEscrowTransaction(
          tradeId!,
          initiator_user_id,
          recipient_user_id,
          initiator_value,
          recipient_value
        );
      }
    },
    onSuccess: () => {
      toast({ title: "Trade Accepted", description: "You have accepted the trade proposal." });
      refetch();
    },
    onError: () => {
      toast({ variant: "destructive", title: "Error", description: "There was a problem accepting the trade." });
    },
  });

  // ── Decline trade ────────────────────────────────────────────────────────────
  const { mutate: declineTrade, isPending: isDecliningTrade } = useMutation({
    mutationFn: () => updateTradeStatus(tradeId!, "declined"),
    onSuccess: () => {
      toast({ title: "Trade Declined", description: "You have declined the trade proposal." });
      refetch();
    },
    onError: () => {
      toast({ variant: "destructive", title: "Error", description: "There was a problem declining the trade." });
    },
  });

  // ── Pay escrow (payment gateway pending — simulates for development) ────────
  const payEscrow = async (): Promise<boolean> => {
    if (!trade?.escrow || !user) return false;
    try {
      const updatedEscrow = await updateEscrowPayment(
        trade.escrow.id,
        user.id,
        `simulated-${Date.now()}`,
        isInitiator
          ? trade.escrow.initiatorEscrowAmount.finalAmount
          : trade.escrow.recipientEscrowAmount.finalAmount
      );
      if (updatedEscrow.initiator_paid && updatedEscrow.recipient_paid) {
        await updateTradeStatus(tradeId!, "processing");
      }
      refetch();
      return true;
    } catch (e) {
      console.error("Escrow payment error:", e);
      return false;
    }
  };

  // ── Confirm receipt ────────────────────────────────────────────────────────
  const confirmReceipt = async (): Promise<boolean> => {
    try {
      await updateTradeStatus(tradeId!, "processing");
      await sendTradeMessage(
        tradeId!,
        "Receipt confirmed. The sender can now release the escrow to complete the trade.",
        "system"
      );
      refetch();
      return true;
    } catch (e) {
      console.error("Confirm receipt error:", e);
      return false;
    }
  };

  // ── Release escrow ────────────────────────────────────────────────────────
  const releaseEscrow = async (releaseCode: string): Promise<boolean> => {
    if (!trade?.escrow) return false;
    try {
      await releaseEscrowFunds(trade.escrow.id, releaseCode);
      await updateTradeStatus(tradeId!, "completed");
      await sendTradeMessage(
        tradeId!,
        "Escrow released. Trade complete — thanks for using CollectX!",
        "system"
      );
      refetch();
      return true;
    } catch (e: any) {
      console.error("Release escrow error:", e);
      toast({ variant: "destructive", title: "Invalid release code", description: e?.message || "Please check the code and try again." });
      return false;
    }
  };

  // ── Update shipping ────────────────────────────────────────────────────────
  const handleUpdateShipping = async () => {
    setIsUpdatingShipping(true);
    try {
      await updateTradeStatus(tradeId!, "shipped", {
        tracking_number: trackingNumber,
        shipping_address: shippingCarrier,
      } as any);
      await sendTradeMessage(
        tradeId!,
        `Cards shipped via ${shippingCarrier}. Tracking: ${trackingNumber}`,
        "system"
      );
      toast({ title: "Shipping updated", description: "Shipping information saved successfully." });
      setIsShippingEditMode(false);
      refetch();
    } catch (e) {
      toast({ variant: "destructive", title: "Shipping update failed", description: "There was a problem updating shipping." });
    } finally {
      setIsUpdatingShipping(false);
    }
  };

  // ── Image handlers ──────────────────────────────────────────────────────────
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() && !selectedImage) return;
    if (selectedImage) {
      uploadImage(selectedImage);
    } else {
      sendMessage(newMessage);
    }
  };

  // ── Derived state ──────────────────────────────────────────────────────────
  const getStatusBadge = (status: TradeStatus) => {
    switch (status) {
      case "proposed": return <Badge variant="warning">Proposed</Badge>;
      case "accepted": return <Badge variant="info">Accepted</Badge>;
      case "processing": return <Badge variant="info">Processing</Badge>;
      case "escrowed": return <Badge variant="info">Escrowed</Badge>;
      case "shipped": return <Badge variant="info">Shipped</Badge>;
      case "completed": return <Badge variant="success">Completed</Badge>;
      case "declined": return <Badge variant="danger">Declined</Badge>;
      case "disputed": return <Badge variant="danger">Disputed</Badge>;
      case "cancelled": return <Badge variant="danger">Cancelled</Badge>;
      case "pending": return <Badge variant="warning">Pending</Badge>;
      default: return <Badge variant="default">Unknown</Badge>;
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
      default:
        return 0;
    }
  };

  const step = trade ? getStatusStep(trade.status) : 0;
  const isInitiator = trade?.initiator.userId === user?.id;
  const isRecipient = trade?.recipient.userId === user?.id;
  const canAccept = trade?.status === "proposed" && isRecipient;
  const canDecline = trade?.status === "proposed" && isRecipient;
  const showShippingInfo = ["escrowed", "shipped", "completed", "processing"].includes(trade?.status || "");

  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard", description: message });
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="container py-12">
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading trade details...</p>
        </div>
      </div>
    );
  }

  if (isError || !trade) {
    return (
      <div className="container py-12">
        <div className="text-center py-20">
          <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Trade Not Found</h2>
          <p className="text-muted-foreground mb-6">This trade doesn't exist or you don't have permission to view it.</p>
          <Button asChild>
            <Link to="/trades">Back to Trades</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (user && !isInitiator && !isRecipient) {
    return (
      <div className="container py-12">
        <div className="text-center py-20">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-6">You are not a participant in this trade.</p>
          <Button asChild>
            <Link to="/trades">Back to Trades</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-12">
      {isShowingLightbox && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setIsShowingLightbox(null)}
        >
          <div className="bg-background rounded-lg overflow-hidden max-w-3xl w-full">
            <div className="p-4 flex justify-between items-center border-b">
              <h3 className="font-medium">Image Preview</h3>
              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setIsShowingLightbox(null); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 flex justify-center">
              <OptimizedImage src={isShowingLightbox} alt="Expanded view" className="max-h-[70vh] object-contain" lazy={false} />
            </div>
          </div>
        </div>
      )}

      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/trades" className="text-muted-foreground hover:underline flex items-center">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Trades
          </Link>
          <h1 className="text-2xl font-bold">Trade Details</h1>
        </div>
        <div>{getStatusBadge(trade.status)}</div>
      </div>

      {/* Participants & Cards */}
      <GlassCard className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { participant: trade.initiator, label: isInitiator ? "You're giving:" : "They're giving:" },
            { participant: trade.recipient, label: isRecipient ? "You're giving:" : "They're giving:" },
          ].map(({ participant, label }, idx) => (
            <div key={idx}>
              <div className="text-xs text-muted-foreground mb-1">{label}</div>
              <div className="flex items-center gap-2">
                <div className="relative h-14 w-14 rounded-md overflow-hidden bg-muted">
                  {participant.offeringCards[0]?.imageUrl ? (
                    <img src={participant.offeringCards[0].imageUrl} alt="Cards preview" className="object-cover h-full w-full" />
                  ) : (
                    <div className="flex items-center justify-center h-full w-full">
                      <Package className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  {participant.offeringCards.length > 1 && (
                    <div className="absolute top-0.5 right-0.5 bg-primary/90 text-white text-[10px] font-medium h-4 w-4 rounded-full flex items-center justify-center">
                      {participant.offeringCards.length}
                    </div>
                  )}
                </div>
                <div>
                  <Package className="h-4 w-4 text-muted-foreground mb-1" />
                  {participant.escrowAmount.finalAmount > 0 && (
                    <div className="text-xs font-medium">
                      {formatCurrency(participant.escrowAmount.finalAmount, participant.escrowAmount.currency)}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-2">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>{participant.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{participant.username}</span>
                    <Badge variant="reputation" reputation={participant.reputation} size="sm">
                      {participant.reputation.charAt(0).toUpperCase() + participant.reputation.slice(1)}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Escrow Protection Panel */}
      {trade.escrow && (
        <EscrowDetails
          escrow={trade.escrow}
          isInitiator={isInitiator}
          onPayEscrow={payEscrow}
          onReleaseEscrow={releaseEscrow}
          onConfirmReceipt={confirmReceipt}
        />
      )}

      {/* Escrow Coming-Soon notice when escrow not yet created after acceptance */}
      {!trade.escrow && trade.status === "accepted" && (
        <GlassCard className="mb-6">
          <div className="p-4 flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Escrow Protection — Setting Up</p>
              <p className="text-sm text-muted-foreground mt-1">
                The escrow for this trade is being created. Refresh the page in a moment.
              </p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Shipping Info */}
      {showShippingInfo && (
        <GlassCard className="mb-6">
          <div className="p-4">
            <h3 className="text-lg font-medium mb-2">Shipping Information</h3>
            {isShippingEditMode ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="shippingCarrier">Shipping Carrier</Label>
                  <Input id="shippingCarrier" value={shippingCarrier} onChange={(e) => setShippingCarrier(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="trackingNumber">Tracking Number</Label>
                  <Input id="trackingNumber" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} />
                </div>
                <div>
                  <Label>Estimated Delivery</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-[240px] justify-start text-left font-normal", !estimatedDelivery && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {estimatedDelivery ? format(estimatedDelivery, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="center" side="bottom">
                      <Calendar mode="single" selected={estimatedDelivery} onSelect={setEstimatedDelivery} disabled={(date) => date < new Date()} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setIsShippingEditMode(false)}>Cancel</Button>
                  <Button onClick={handleUpdateShipping} disabled={isUpdatingShipping}>
                    {isUpdatingShipping ? (<><span>Updating...</span><Loader2 className="ml-2 h-4 w-4 animate-spin" /></>) : "Update Shipping"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-sm">Carrier: {trade.escrow?.shippingInfo?.carrier || shippingCarrier || "Not set"}</div>
                <div className="text-sm flex items-center gap-1">
                  Tracking: {trade.escrow?.shippingInfo?.trackingNumber || trackingNumber || "Not set"}
                  {(trade.escrow?.shippingInfo?.trackingNumber || trackingNumber) && (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(trade.escrow?.shippingInfo?.trackingNumber || trackingNumber, "Tracking number copied.")}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                {isInitiator && ["processing", "escrowed"].includes(trade.status) && (
                  <Button size="sm" onClick={() => setIsShippingEditMode(true)}>
                    <Truck className="h-4 w-4 mr-2" />
                    Add Shipping Info
                  </Button>
                )}
              </div>
            )}
          </div>
        </GlassCard>
      )}

      {/* Trade Progress Stepper */}
      {!["declined", "disputed", "cancelled"].includes(trade.status) && (
        <GlassCard className="mb-6">
          <div className="relative p-6">
            <h3 className="text-lg font-medium mb-4">Trade Progress</h3>
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-muted transform -translate-y-1/2" />
            <div className="absolute top-1/2 left-0 h-1 bg-primary transform -translate-y-1/2" style={{ width: `${(step / 5) * 100}%` }} />
            <div className="relative flex justify-between">
              {[
                { n: 1, label: "Proposed" },
                { n: 2, label: "Accepted" },
                { n: 3, label: "Escrowed" },
                { n: 4, label: "Shipped" },
                { n: 5, label: "Completed" },
              ].map(({ n, label }) => (
                <div key={n} className="flex flex-col items-center">
                  <div className={`h-6 w-6 rounded-full ${step >= n ? "bg-primary" : "bg-muted"} flex items-center justify-center text-white text-xs`}>
                    {n}
                  </div>
                  <span className="text-xs mt-1">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      )}

      {/* Action Buttons */}
      <GlassCard className="mb-6">
        <div className="flex items-center justify-around p-4 gap-2 flex-wrap">
          {canAccept && (
            <Button onClick={() => acceptTrade()} disabled={isAcceptingTrade}>
              {isAcceptingTrade ? <><span>Accepting...</span><Loader2 className="ml-2 h-4 w-4 animate-spin" /></> : "Accept Trade"}
            </Button>
          )}
          {canDecline && (
            <Button variant="destructive" onClick={() => declineTrade()} disabled={isDecliningTrade}>
              {isDecliningTrade ? <><span>Declining...</span><Loader2 className="ml-2 h-4 w-4 animate-spin" /></> : "Decline Trade"}
            </Button>
          )}
          {!canAccept && !canDecline && trade.status === "proposed" && (
            <p className="text-sm text-muted-foreground">Waiting for the other party to respond.</p>
          )}
          {trade.status === "completed" && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Trade Complete</span>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Chat */}
      <GlassCard>
        <div className="p-4">
          <h3 className="text-lg font-medium mb-4">Trade Chat</h3>
          <ScrollArea className="h-[300px] mb-4">
            <div className="space-y-2">
              {trade.messages.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No messages yet. Start the conversation!</p>
              )}
              {trade.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "p-3 rounded-md",
                    msg.systemMessage
                      ? "bg-muted/50 text-center text-sm text-muted-foreground italic"
                      : msg.userId === user?.id
                      ? "bg-primary/10 text-right ml-auto w-fit max-w-[75%]"
                      : "bg-secondary/10 text-left mr-auto w-fit max-w-[75%]"
                  )}
                >
                  {!msg.systemMessage && (
                    <div className="text-xs text-muted-foreground">
                      {msg.userId === user?.id ? "You" : msg.username}
                    </div>
                  )}
                  {msg.message && <div className="mb-1">{msg.message}</div>}
                  {msg.imageUrl && (
                    <div className="cursor-pointer rounded-md overflow-hidden mb-2" onClick={() => setIsShowingLightbox(msg.imageUrl)}>
                      <img src={msg.imageUrl} alt="Trade image" className="max-h-48 object-cover" />
                    </div>
                  )}
                  {!msg.systemMessage && (
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(msg.createdAt), "Pp")}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="flex items-end gap-2">
            <input type="file" className="hidden" ref={fileInputRef} accept="image/*" onChange={handleImageSelect} />
            {imagePreview ? (
              <div className="relative h-20 w-20 rounded-md overflow-hidden border border-border">
                <img src={imagePreview} alt="Selected" className="h-full w-full object-cover" />
                <Button variant="ghost" size="icon" className="absolute top-0 right-0 bg-black/50 rounded-full h-5 w-5 p-0.5" onClick={removeSelectedImage}>
                  <X className="h-3 w-3 text-white" />
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => fileInputRef.current?.click()}>
                <Paperclip className="h-4 w-4" />
              </Button>
            )}
            <Textarea
              placeholder="Type your message..."
              className="flex-1 resize-none"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <Button onClick={handleSendMessage} disabled={(!newMessage.trim() && !selectedImage) || isSendingMessage || isUploadingImage}>
              {isSendingMessage || isUploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

export default TradeDetail;
