import { useEffect, useState } from "react";
import { Copy, Loader2, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import GlassCard from "@/components/ui/custom/GlassCard";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { markTradeShipped } from "@/services/tradeService";
import type { TradeProposal } from "@/models/escrow";

type Props = {
  trade: TradeProposal;
  tradeId: string;
  currentUserId: string | undefined;
  onUpdated: () => void;
};

type ShipmentRow = {
  id: string;
  sender_user_id: string;
  tracking_number: string | null;
  status: string;
  shipped_at: string | null;
  delivered_at: string | null;
  metadata: any;
};

export const ShippingInfoCard = ({ trade, tradeId, currentUserId, onUpdated }: Props) => {
  const { toast } = useToast();
  const [shipments, setShipments] = useState<ShipmentRow[]>([]);
  const [tracking, setTracking] = useState("");
  const [carrier, setCarrier] = useState("");
  const [saving, setSaving] = useState(false);

  const canShow = ["accepted", "shipped", "completed"].includes(trade.status);

  const refresh = async () => {
    const { data } = await (supabase as any)
      .from("trade_shipments_public")
      .select("id, sender_user_id, tracking_number, status, shipped_at, delivered_at, metadata")
      .eq("trade_id", tradeId);
    setShipments((data as any[]) ?? []);
  };

  useEffect(() => {
    if (canShow) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tradeId, canShow]);

  if (!canShow) return null;

  const mine = shipments.find((s) => s.sender_user_id === currentUserId);
  const theirs = shipments.find((s) => s.sender_user_id !== currentUserId);

  const submit = async () => {
    if (!tracking.trim() || !carrier.trim()) {
      toast({ variant: "destructive", title: "Missing info", description: "Carrier and tracking are required." });
      return;
    }
    setSaving(true);
    try {
      await markTradeShipped(tradeId, tracking.trim(), carrier.trim());
      toast({ title: "Marked as shipped" });
      setTracking(""); setCarrier("");
      await refresh();
      onUpdated();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Couldn't update shipment", description: e?.message ?? "Try again." });
    } finally {
      setSaving(false);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied" });
  };

  return (
    <GlassCard className="mb-6">
      <div className="p-4 space-y-4">
        <h3 className="text-lg font-medium flex items-center gap-2"><Truck className="h-5 w-5" /> Shipping</h3>

        {/* Your shipment */}
        <div className="rounded-md border p-3">
          <div className="text-sm font-medium mb-2">Your shipment</div>
          {mine ? (
            <div className="text-sm space-y-1">
              <div>Status: <span className="capitalize">{mine.status}</span></div>
              <div>Carrier: {mine.metadata?.carrier || "—"}</div>
              <div className="flex items-center gap-2">
                Tracking: {mine.tracking_number || "—"}
                {mine.tracking_number && (
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copy(mine.tracking_number!)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No shipment recorded yet.</p>
          )}

          {trade.status === "accepted" && (mine?.status !== "shipped" && mine?.status !== "delivered") && (
            <div className="mt-3 space-y-2">
              <div>
                <Label htmlFor="carrier">Carrier</Label>
                <Input id="carrier" value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="Royal Mail, USPS…" />
              </div>
              <div>
                <Label htmlFor="tracking">Tracking number</Label>
                <Input id="tracking" value={tracking} onChange={(e) => setTracking(e.target.value)} />
              </div>
              <Button size="sm" onClick={submit} disabled={saving}>
                {saving ? <>Saving...<Loader2 className="ml-2 h-4 w-4 animate-spin" /></> : "Mark as shipped"}
              </Button>
            </div>
          )}
        </div>

        {/* Their shipment (public projection — no address ever exposed) */}
        <div className="rounded-md border p-3">
          <div className="text-sm font-medium mb-2">Their shipment</div>
          {theirs ? (
            <div className="text-sm space-y-1">
              <div>Status: <span className="capitalize">{theirs.status}</span></div>
              <div>Carrier: {theirs.metadata?.carrier || "—"}</div>
              <div className="flex items-center gap-2">
                Tracking: {theirs.tracking_number || "—"}
                {theirs.tracking_number && (
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copy(theirs.tracking_number!)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Awaiting the other party to ship.</p>
          )}
        </div>
      </div>
    </GlassCard>
  );
};
