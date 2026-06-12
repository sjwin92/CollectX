import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import GlassCard from "@/components/ui/custom/GlassCard";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { updateShippingInfo } from "@/services/tradeService";
import type { TradeProposal } from "@/models/escrow";

type Props = {
  trade: TradeProposal;
  tradeId: string;
  isInitiator: boolean;
  onUpdated: () => void;
};

export const ShippingInfoCard = ({ trade, tradeId, isInitiator, onUpdated }: Props) => {
  const { toast } = useToast();
  const showShipping =
    trade.status === "escrowed" || trade.status === "shipped" || trade.status === "completed";

  const [editMode, setEditMode] = useState(false);
  const [carrier, setCarrier] = useState(trade.escrow?.shippingInfo?.carrier ?? "");
  const [trackingNumber, setTrackingNumber] = useState(
    trade.escrow?.shippingInfo?.trackingNumber ?? "",
  );
  const [estimatedDelivery, setEstimatedDelivery] = useState<Date | undefined>(
    trade.escrow?.shippingInfo?.estimatedDelivery
      ? new Date(trade.escrow.shippingInfo.estimatedDelivery)
      : undefined,
  );
  const [saving, setSaving] = useState(false);

  if (!showShipping) return null;

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateShippingInfo(tradeId, carrier, trackingNumber, estimatedDelivery);
      toast({ title: "Shipping updated", description: "Shipping information saved." });
      setEditMode(false);
      onUpdated();
    } catch {
      toast({
        variant: "destructive",
        title: "Shipping update failed",
        description: "There was a problem updating the shipping information.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlassCard className="mb-6">
      <div className="p-4">
        <h3 className="text-lg font-medium mb-2">Shipping Information</h3>
        {editMode ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="shippingCarrier">Shipping Carrier</Label>
              <Input
                id="shippingCarrier"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="trackingNumber">Tracking Number</Label>
              <Input
                id="trackingNumber"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
              />
            </div>
            <div>
              <Label>Estimated Delivery</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[240px] justify-start text-left font-normal",
                      !estimatedDelivery && "text-muted-foreground",
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
                    disabled={(d) => d < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditMode(false)}>
                Cancel
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving ? (
                  <>Updating...<Loader2 className="ml-2 h-4 w-4 animate-spin" /></>
                ) : "Update Shipping"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-sm">Carrier: {trade.escrow?.shippingInfo?.carrier || "N/A"}</div>
            <div className="text-sm">
              Tracking Number: {trade.escrow?.shippingInfo?.trackingNumber || "N/A"}
              {trade.escrow?.shippingInfo?.trackingNumber && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copy(trade.escrow!.shippingInfo!.trackingNumber)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="text-sm">
              Estimated Delivery:{" "}
              {trade.escrow?.shippingInfo?.estimatedDelivery
                ? format(new Date(trade.escrow.shippingInfo.estimatedDelivery), "PPP")
                : "N/A"}
            </div>
            {isInitiator && trade.status === "escrowed" && (
              <Button size="sm" onClick={() => setEditMode(true)}>
                Edit Shipping Info
              </Button>
            )}
          </div>
        )}
      </div>
    </GlassCard>
  );
};
