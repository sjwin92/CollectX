
import React, { useState, useRef } from "react";
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
  uploadTradeImage,
  confirmTradeReceipt,
  validateReleaseEscrow,
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
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useUser } from "@/hooks/useUser";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import EscrowDetails from "@/components/trades/EscrowDetails";

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
  const [isUpdatingShipping, setIsUpdatingShipping] = useState(false);
  
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isShowingLightbox, setIsShowingLightbox] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    mutate: uploadImage,
    isPending: isUploadingImage,
    isError: isUploadImageError,
  } = useMutation({
    mutationFn: (file: File) => uploadTradeImage(file),
    onSuccess: (imageUrl) => {
      if (newMessage.trim() === '') {
        sendMessage("I've shared an image with you.", imageUrl);
      } else {
        sendMessage(newMessage, imageUrl);
      }
      setSelectedImage(null);
      setImagePreview(null);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "There was a problem uploading your image.",
      });
    },
  });

  const {
    mutate: sendMessageMutation,
    isPending: isSendingMessage,
    isError: isSendMessageError,
  } = useMutation({
    mutationFn: ({ message, imageUrl }: { message: string; imageUrl: string | null }) => 
      addTradeMessage(tradeId!, message, imageUrl),
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

  const sendMessage = (message: string, imageUrl: string | null = null) => {
    sendMessageMutation({ message, imageUrl });
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAttachImage = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() && !selectedImage) return;
    
    if (selectedImage) {
      uploadImage(selectedImage);
    } else {
      sendMessage(newMessage);
    }
  };

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
    mutate: confirmReceipt,
    isPending: isConfirmingReceipt,
    isError: isConfirmReceiptError,
  } = useMutation({
    mutationFn: () => confirmTradeReceipt(tradeId!),
    onSuccess: () => {
      toast({
        title: "Receipt confirmed",
        description: "You have confirmed receipt of the traded cards.",
      });
      refetch();
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "There was a problem confirming receipt.",
      });
    },
  });

  const {
    mutate: validateRelease,
    isPending: isValidatingRelease,
    isError: isValidateReleaseError,
  } = useMutation({
    mutationFn: (releaseCode: string) => validateReleaseEscrow(tradeId!, releaseCode),
    onSuccess: (isValid, releaseCode) => {
      if (isValid) {
        releaseEscrow(releaseCode);
      } else {
        toast({
          variant: "destructive",
          title: "Invalid release code",
          description: "The release code you entered is not valid.",
        });
      }
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "There was a problem validating the release code.",
      });
    },
  });

  const {
    mutate: releaseEscrow,
    isPending: isReleasingEscrow,
    isError: isReleaseEscrowError,
  } = useMutation({
    mutationFn: (releaseCode: string) => releaseTradeEscrow(tradeId!, releaseCode),
    onSuccess: (success) => {
      if (success) {
        toast({
          title: "Escrow released",
          description: "The escrow has been released and the trade is now complete.",
        });
        refetch();
      } else {
        toast({
          variant: "destructive",
          title: "Release failed",
          description: "Failed to release the escrow. Please try again.",
        });
      }
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "There was a problem releasing the escrow.",
      });
    },
  });

  // FIX: Return boolean instead of void
  const handleEscrowPayment = async (): Promise<boolean> => {
    try {
      if (isInitiator) {
        await payInitiator();
      } else {
        await payRecipient();
      }
      return true;
    } catch (error) {
      console.error("Error paying escrow:", error);
      return false;
    }
  };

  const handleReleaseEscrow = async (releaseCode: string): Promise<boolean> => {
    try {
      await validateRelease(releaseCode);
      // Since validateRelease is a mutate function that handles the success internally,
      // we can just return true here to indicate the process started
      return true;
    } catch (error) {
      console.error("Error validating release code:", error);
      return false;
    }
  };

  const handleConfirmReceipt = async (): Promise<boolean> => {
    try {
      await confirmReceipt();
      return true;
    } catch (error) {
      console.error("Error confirming receipt:", error);
      return false;
    }
  };

  // FIX: Add handling for updating shipping info
  const handleUpdateShipping = async () => {
    setIsUpdatingShipping(true);
    try {
      await updateShippingInfo(
        tradeId!,
        shippingCarrier,
        trackingNumber,
        estimatedDelivery
      );
      toast({
        title: "Shipping updated",
        description: "Shipping information has been updated successfully.",
      });
      setIsShippingEditMode(false);
      refetch();
    } catch (error) {
      console.error("Error updating shipping:", error);
      toast({
        variant: "destructive",
        title: "Shipping update failed",
        description: "There was a problem updating the shipping information.",
      });
    } finally {
      setIsUpdatingShipping(false);
    }
  };

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
      {isShowingLightbox && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setIsShowingLightbox(null)}>
          <div className="bg-background rounded-lg overflow-hidden max-w-3xl w-full">
            <div className="p-4 flex justify-between items-center border-b">
              <h3 className="font-medium">Image Preview</h3>
              <Button variant="ghost" size="icon" onClick={(e) => {
                e.stopPropagation();
                setIsShowingLightbox(null);
              }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 flex justify-center">
              <OptimizedImage 
                src={isShowingLightbox} 
                alt="Expanded view" 
                className="max-h-[70vh] object-contain" 
                useAI={false}
                lazy={false}
              />
            </div>
          </div>
        </div>
      )}

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

      {trade.escrow && (
        <EscrowDetails
          escrow={trade.escrow}
          isInitiator={isInitiator}
          onPayEscrow={handleEscrowPayment}
          onReleaseEscrow={handleReleaseEscrow}
          onConfirmReceipt={handleConfirmReceipt}
        />
      )}

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
                  <Button onClick={handleUpdateShipping} disabled={isUpdatingShipping}>
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
            <Button onClick={() => releaseEscrow("123456")} disabled={isReleasingEscrow}>
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
                  {msg.message && <div className="mb-2">{msg.message}</div>}
                  {msg.imageUrl && (
                    <div 
                      className="cursor-pointer rounded-md overflow-hidden mb-2"
                      onClick={() => setIsShowingLightbox(msg.imageUrl)}
                    >
                      <img 
                        src={msg.imageUrl} 
                        alt="Trade image" 
                        className="max-h-48 object-cover"
                      />
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(msg.createdAt), "Pp")}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          
          <div className="flex items-end gap-2">
            <input 
              type="file" 
              className="hidden" 
              ref={fileInputRef}
              accept="image/*" 
              onChange={handleImageSelect} 
            />
            
            {imagePreview ? (
              <div className="relative h-20 w-20 rounded-md overflow-hidden border border-border">
                <img 
                  src={imagePreview} 
                  alt="Selected" 
                  className="h-full w-full object-cover" 
                />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-0 right-0 bg-black/50 rounded-full h-5 w-5 p-0.5"
                  onClick={removeSelectedImage}
                >
                  <X className="h-3 w-3 text-white" />
                </Button>
              </div>
            ) : (
              <Button 
                variant="outline" 
                size="icon" 
                className="h-10 w-10"
                onClick={handleAttachImage}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
            )}
            
            <Textarea
              placeholder="Type your message..."
              className="flex-1 resize-none"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={(!newMessage.trim() && !selectedImage) || isSendingMessage || isUploadingImage}
            >
              {(isSendingMessage || isUploadingImage) ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <SendHorizontal className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

export default TradeDetail;
