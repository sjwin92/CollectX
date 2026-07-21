import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, Loader2, MapPin, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import GlassCard from "@/components/ui/custom/GlassCard";
import { useToast } from "@/hooks/use-toast";
import {
  getTradeShipments,
  markTradeShipped,
  submitTradeAddress,
  getMyTradeAddress,
  getTradeDestinationAddress,
  type SafeShipment,
  type TradeAddress,
} from "@/services/tradeService";
import type { TradeProposal } from "@/models/trade";

type Props = {
  trade: TradeProposal;
  tradeId: string;
  currentUserId: string | undefined;
  onUpdated: () => void;
};

const emptyAddress: TradeAddress = {
  full_name: "",
  line1: "",
  line2: "",
  city: "",
  region: "",
  postal_code: "",
  country: "",
};

const formatAddress = (a: TradeAddress | null | undefined) => {
  if (!a) return null;
  const lines = [
    a.full_name,
    a.line1,
    a.line2,
    [a.city, a.region, a.postal_code].filter(Boolean).join(", "),
    a.country,
  ].filter(Boolean);
  return lines.join("\n");
};

export const ShippingInfoCard = ({ trade, tradeId, currentUserId, onUpdated }: Props) => {
  const { toast } = useToast();

  const canShow = ["accepted", "shipped", "completed"].includes(trade.status);
  const canSubmitAddress = trade.status === "accepted";

  const [tracking, setTracking] = useState("");
  const [carrier, setCarrier] = useState("");
  const [saving, setSaving] = useState(false);
  const [address, setAddress] = useState<TradeAddress>(emptyAddress);
  const [savingAddress, setSavingAddress] = useState(false);

  const shipmentsQ = useQuery<SafeShipment[]>({
    queryKey: ["trade-shipments", tradeId],
    queryFn: () => getTradeShipments(tradeId),
    enabled: !!tradeId && canShow,
  });

  const myAddressQ = useQuery({
    queryKey: ["trade-address-mine", tradeId, currentUserId],
    queryFn: () => getMyTradeAddress(tradeId),
    enabled: !!tradeId && !!currentUserId && canShow,
  });

  const destAddressQ = useQuery({
    queryKey: ["trade-address-destination", tradeId, currentUserId],
    queryFn: () => getTradeDestinationAddress(tradeId),
    enabled: !!tradeId && !!currentUserId && canShow,
  });

  useEffect(() => {
    if (myAddressQ.data) setAddress({ ...emptyAddress, ...myAddressQ.data });
  }, [myAddressQ.data]);

  if (!canShow) return null;

  const shipments = shipmentsQ.data ?? [];
  const mine = shipments.find((s) => s.sender_user_id === currentUserId);
  const theirs = shipments.find((s) => s.sender_user_id !== currentUserId);
  const destinationReady = !!destAddressQ.data;

  const saveAddress = async () => {
    if (!address.line1?.trim() || !address.city?.trim() || !address.country?.trim()) {
      toast({ variant: "destructive", title: "Missing address", description: "Address line, city and country are required." });
      return;
    }
    setSavingAddress(true);
    try {
      await submitTradeAddress(tradeId, address);
      toast({ title: "Address saved", description: "Only you can see this. The other party will use it as their destination." });
      await Promise.all([myAddressQ.refetch(), destAddressQ.refetch()]);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Couldn't save address", description: e?.message ?? "Try again." });
    } finally {
      setSavingAddress(false);
    }
  };

  const submitShipped = async () => {
    if (!tracking.trim() || !carrier.trim()) {
      toast({ variant: "destructive", title: "Missing info", description: "Carrier and tracking are required." });
      return;
    }
    if (!destinationReady) {
      toast({ variant: "destructive", title: "Not ready", description: "Waiting for the other party's delivery address." });
      return;
    }
    setSaving(true);
    try {
      await markTradeShipped(tradeId, tracking.trim(), carrier.trim());
      toast({ title: "Marked as shipped" });
      setTracking(""); setCarrier("");
      await shipmentsQ.refetch();
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

  const destinationText = formatAddress(destAddressQ.data);

  return (
    <GlassCard className="mb-6">
      <div className="p-4 space-y-5">
        <h3 className="text-lg font-medium flex items-center gap-2"><Truck className="h-5 w-5" /> Shipping</h3>

        {/* My address (private) */}
        <div className="rounded-md border p-3">
          <div className="text-sm font-medium mb-2 flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Your delivery address (private)
          </div>
          {canSubmitAddress ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="sm:col-span-2">
                <Label htmlFor="full_name">Full name</Label>
                <Input id="full_name" value={address.full_name ?? ""} onChange={(e) => setAddress({ ...address, full_name: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="line1">Address line 1</Label>
                <Input id="line1" value={address.line1 ?? ""} onChange={(e) => setAddress({ ...address, line1: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="line2">Address line 2</Label>
                <Input id="line2" value={address.line2 ?? ""} onChange={(e) => setAddress({ ...address, line2: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input id="city" value={address.city ?? ""} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="region">Region</Label>
                <Input id="region" value={address.region ?? ""} onChange={(e) => setAddress({ ...address, region: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="postal_code">Postal code</Label>
                <Input id="postal_code" value={address.postal_code ?? ""} onChange={(e) => setAddress({ ...address, postal_code: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                <Input id="country" value={address.country ?? ""} onChange={(e) => setAddress({ ...address, country: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Button size="sm" onClick={saveAddress} disabled={savingAddress}>
                  {savingAddress ? <>Saving...<Loader2 className="ml-2 h-4 w-4 animate-spin" /></> : (myAddressQ.data ? "Update address" : "Save address")}
                </Button>
              </div>
            </div>
          ) : (
            <pre className="whitespace-pre-wrap text-sm text-muted-foreground">
              {formatAddress(myAddressQ.data) ?? "Not submitted."}
            </pre>
          )}
        </div>

        {/* Destination — shown only to the caller (they need it to ship) */}
        <div className="rounded-md border p-3">
          <div className="text-sm font-medium mb-2 flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Ship your parcel to
          </div>
          {destinationText ? (
            <div className="flex items-start gap-2">
              <pre className="whitespace-pre-wrap text-sm flex-1">{destinationText}</pre>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copy(destinationText)}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Waiting for the other participant to submit their address.
            </p>
          )}
        </div>

        {/* Your parcel */}
        <div className="rounded-md border p-3">
          <div className="text-sm font-medium mb-2">Your parcel</div>
          {mine ? (
            <div className="text-sm space-y-1">
              <div>Status: <span className="capitalize">{mine.status}</span></div>
              <div>Carrier: {mine.carrier || "—"}</div>
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

          {trade.status === "accepted" && mine && mine.status !== "shipped" && mine.status !== "delivered" && (
            <div className="mt-3 space-y-2">
              <div>
                <Label htmlFor="carrier">Carrier</Label>
                <Input id="carrier" value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="Royal Mail, USPS…" />
              </div>
              <div>
                <Label htmlFor="tracking">Tracking number</Label>
                <Input id="tracking" value={tracking} onChange={(e) => setTracking(e.target.value)} />
              </div>
              <Button size="sm" onClick={submitShipped} disabled={saving || !destinationReady}>
                {saving ? <>Saving...<Loader2 className="ml-2 h-4 w-4 animate-spin" /></> : "Mark as shipped"}
              </Button>
              {!destinationReady && (
                <p className="text-xs text-muted-foreground">
                  Enabled once the other participant submits their delivery address.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Their parcel (safe fields only) */}
        <div className="rounded-md border p-3">
          <div className="text-sm font-medium mb-2">Their parcel</div>
          {theirs ? (
            <div className="text-sm space-y-1">
              <div>Status: <span className="capitalize">{theirs.status}</span></div>
              <div>Carrier: {theirs.carrier || "—"}</div>
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
