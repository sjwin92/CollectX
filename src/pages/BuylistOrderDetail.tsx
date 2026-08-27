import React, { useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/useUser";
import {
  getBuylistOrderById,
  getMyBuylistOrderAddress,
  getBuylistOrderDestinationAddress,
  getBuylistOrderShipment,
  payBuylistOrder,
  type OrderAddress,
} from "@/services/storeBuylistService";
import { useBuylistOrderMutations } from "@/components/orders/useBuylistOrderMutations";
import ShipmentForm from "@/components/orders/ShipmentForm";
import ShipmentInfo from "@/components/orders/ShipmentInfo";

const BuylistOrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useUser();
  const [address, setAddress] = useState<OrderAddress>({});
  const [disputeReason, setDisputeReason] = useState("");
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [paying, setPaying] = useState(false);

  const { data: order, isLoading, refetch } = useQuery({
    queryKey: ["buylist-order", id],
    queryFn: () => getBuylistOrderById(id!),
    enabled: !!id,
  });

  const isStore = !!user && order?.store_id === user.id;      // payer + recipient
  const isSeller = !!user && order?.seller_user_id === user.id; // collector + shipper

  const { data: myAddress } = useQuery({
    queryKey: ["buylist-order-address", id],
    queryFn: () => getMyBuylistOrderAddress(id!),
    enabled: !!id && isStore,
  });

  const { data: destinationAddress } = useQuery({
    queryKey: ["buylist-order-destination-address", id],
    queryFn: () => getBuylistOrderDestinationAddress(id!),
    enabled: !!id && isSeller && (order?.status === "paid_held" || order?.status === "shipped"),
  });

  const { data: shipment } = useQuery({
    queryKey: ["buylist-order-shipment", id],
    queryFn: () => getBuylistOrderShipment(id!),
    enabled: !!id && (order?.status === "shipped" || order?.status === "completed"),
  });

  const { submitAddress, markShipped, confirmReceipt, cancel, dispute } = useBuylistOrderMutations(id!, refetch);

  React.useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      toast({ title: "Payment received", description: "It's held in escrow until you confirm the card arrived." });
    } else if (searchParams.get("checkout") === "cancelled") {
      toast({ title: "Checkout cancelled", description: "No payment was taken." });
    }
  }, [searchParams, toast]);

  if (isLoading || !order) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 pt-24 pb-16">
          <div className="container text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const cur = order.currency.toUpperCase();
  const canPay = isStore && order.status === "pending_payment";
  const canSubmitAddress = isStore && order.status === "paid_held" && !myAddress;
  const canMarkShipped = isSeller && order.status === "paid_held" && !!destinationAddress;
  const canConfirmReceipt = isStore && order.status === "shipped";
  const canCancel = (isStore || isSeller) && order.status === "pending_payment";
  const canDispute = (isStore || isSeller) && ["paid_held", "shipped"].includes(order.status);

  const pay = async () => {
    setPaying(true);
    try {
      const url = await payBuylistOrder(order.id);
      window.location.href = url;
    } catch (e) {
      toast({ variant: "destructive", title: "Couldn't start checkout", description: e instanceof Error ? e.message : "Try again." });
      setPaying(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container max-w-2xl space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{order.card_name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isStore ? `Buying from ${order.seller_name}` : `Selling to ${order.store_name}`}
                  </p>
                </div>
                <Badge>{order.status.replace("_", " ")}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.image_url && (
                <img src={order.image_url} alt={order.card_name} className="w-24 rounded mx-auto md:mx-0" />
              )}

              <div className="text-sm space-y-1">
                <div className="flex justify-between text-muted-foreground">
                  <span>Market price</span><span>{cur} {order.market_gbp.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Quote</span><span>{cur} {order.quote_amount.toFixed(2)}</span>
                </div>
                {!isStore && order.platform_fee_amount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Buylist fee</span><span>− {cur} {order.platform_fee_amount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-medium border-t pt-1">
                  <span>{isStore ? "You pay" : "You receive"}</span>
                  <span>{cur} {(isStore ? order.quote_amount : order.seller_payout_amount).toFixed(2)}</span>
                </div>
              </div>

              {order.status === "paid_held" && order.auto_confirm_at && isSeller && (
                <p className="text-xs text-muted-foreground">
                  Payout releases when the store confirms the card arrived, or automatically on {new Date(order.auto_confirm_at).toLocaleDateString()}.
                </p>
              )}

              {shipment?.tracking_number && (
                <ShipmentInfo carrier={shipment.carrier} trackingNumber={shipment.tracking_number} />
              )}
            </CardContent>
          </Card>

          {canPay && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <p className="text-sm">Pay {cur} {order.quote_amount.toFixed(2)} to accept this card. It's held in escrow until you confirm it arrived.</p>
                <Button onClick={pay} disabled={paying}>{paying ? "Starting checkout…" : `Pay ${cur} ${order.quote_amount.toFixed(2)}`}</Button>
              </CardContent>
            </Card>
          )}

          {canSubmitAddress && (
            <Card>
              <CardHeader><CardTitle className="text-base">Where should the collector send it?</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Input placeholder="Full name" value={address.full_name || ""} onChange={(e) => setAddress({ ...address, full_name: e.target.value })} />
                <Input placeholder="Address line 1" value={address.line1 || ""} onChange={(e) => setAddress({ ...address, line1: e.target.value })} />
                <Input placeholder="City" value={address.city || ""} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
                <Input placeholder="Postal code" value={address.postal_code || ""} onChange={(e) => setAddress({ ...address, postal_code: e.target.value })} />
                <Input placeholder="Country" value={address.country || ""} onChange={(e) => setAddress({ ...address, country: e.target.value })} />
                <Button onClick={() => submitAddress.mutate(address)} disabled={submitAddress.isPending}>
                  {submitAddress.isPending ? "Saving..." : "Save address"}
                </Button>
              </CardContent>
            </Card>
          )}

          {isSeller && order.status === "paid_held" && !destinationAddress && (
            <Card><CardContent className="p-4 text-sm text-muted-foreground">Waiting for the store to provide a delivery address before you can ship.</CardContent></Card>
          )}

          {canMarkShipped && (
            <Card>
              <CardHeader><CardTitle className="text-base">Mark as shipped</CardTitle></CardHeader>
              <CardContent>
                <ShipmentForm
                  onSubmit={(tracking, carrier) => markShipped.mutate({ tracking, carrier })}
                  isPending={markShipped.isPending}
                />
              </CardContent>
            </Card>
          )}

          {canConfirmReceipt && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <p className="text-sm">Card arrived as described? Confirming releases the collector's payout and adds it to your inventory.</p>
                <Button onClick={() => confirmReceipt.mutate()} disabled={confirmReceipt.isPending}>
                  {confirmReceipt.isPending ? "Confirming..." : "Confirm receipt"}
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2 flex-wrap">
            {canCancel && (
              <Button variant="outline" onClick={() => cancel.mutate()} disabled={cancel.isPending}>Cancel order</Button>
            )}
            {canDispute && !showDisputeForm && (
              <Button variant="outline" onClick={() => setShowDisputeForm(true)}>Open a dispute</Button>
            )}
          </div>

          {showDisputeForm && (
            <Card>
              <CardHeader><CardTitle className="text-base">Open a dispute</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Textarea placeholder="What went wrong?" value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} />
                <Button
                  variant="destructive"
                  onClick={() => { dispute.mutate(disputeReason); setShowDisputeForm(false); }}
                  disabled={dispute.isPending || !disputeReason.trim()}
                >
                  Submit dispute
                </Button>
              </CardContent>
            </Card>
          )}

          <Link to="/orders" className="text-sm text-muted-foreground hover:underline block">← Back to orders</Link>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BuylistOrderDetail;
