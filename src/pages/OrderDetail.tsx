import React, { useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/useUser";
import {
  getOrderById,
  getMyOrderAddress,
  getOrderDestinationAddress,
  getOrderShipment,
  type OrderAddress,
} from "@/services/orderService";
import { useOrderMutations } from "@/components/orders/useOrderMutations";

const OrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useUser();
  const [address, setAddress] = useState<OrderAddress>({});
  const [tracking, setTracking] = useState("");
  const [carrier, setCarrier] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [showDisputeForm, setShowDisputeForm] = useState(false);

  const { data: order, isLoading, refetch } = useQuery({
    queryKey: ["order", id],
    queryFn: () => getOrderById(id!),
    enabled: !!id,
  });

  const isBuyer = !!user && order?.buyer_user_id === user.id;
  const isSeller = !!user && order?.seller_user_id === user.id;

  const { data: myAddress } = useQuery({
    queryKey: ["order-address", id],
    queryFn: () => getMyOrderAddress(id!),
    enabled: !!id && isBuyer,
  });

  const { data: destinationAddress } = useQuery({
    queryKey: ["order-destination-address", id],
    queryFn: () => getOrderDestinationAddress(id!),
    enabled: !!id && isSeller && (order?.status === "paid_held" || order?.status === "shipped"),
  });

  const { data: shipment } = useQuery({
    queryKey: ["order-shipment", id],
    queryFn: () => getOrderShipment(id!),
    enabled: !!id && (order?.status === "shipped" || order?.status === "completed"),
  });

  const { submitAddress, markShipped, confirmReceipt, cancel, dispute } = useOrderMutations(id!, refetch);

  React.useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      toast({ title: "Payment received", description: "Your payment is held until you confirm delivery." });
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

  const canSubmitAddress = isBuyer && order.status === "paid_held" && !myAddress;
  const canMarkShipped = isSeller && order.status === "paid_held" && !!destinationAddress;
  const canConfirmReceipt = isBuyer && order.status === "shipped";
  const canCancel = isBuyer && order.status === "pending_payment";
  const canDispute = (isBuyer || isSeller) && ["paid_held", "shipped"].includes(order.status);

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
                    {isBuyer ? `Buying from ${order.seller_name}` : `Selling to ${order.buyer_name}`}
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
                <div className="flex justify-between"><span>Item price</span><span>{order.currency.toUpperCase()} {order.item_amount.toFixed(2)}</span></div>
                {order.buyer_fee_amount > 0 && (
                  <div className="flex justify-between text-muted-foreground"><span>Buyer protection fee</span><span>{order.currency.toUpperCase()} {order.buyer_fee_amount.toFixed(2)}</span></div>
                )}
                <div className="flex justify-between font-medium border-t pt-1">
                  <span>{isBuyer ? "Total paid" : "You'll receive"}</span>
                  <span>{order.currency.toUpperCase()} {(isBuyer ? order.total_charged_amount : order.seller_payout_amount ?? order.item_amount - order.seller_fee_amount).toFixed(2)}</span>
                </div>
              </div>

              {order.status === "paid_held" && order.auto_confirm_at && isBuyer && (
                <p className="text-xs text-muted-foreground">
                  Payment is held until you confirm receipt, or automatically on {new Date(order.auto_confirm_at).toLocaleDateString()}.
                </p>
              )}

              {shipment?.tracking_number && (
                <div className="text-sm">
                  <p className="font-medium">Shipment</p>
                  <p className="text-muted-foreground">{shipment.carrier} · {shipment.tracking_number}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {canSubmitAddress && (
            <Card>
              <CardHeader><CardTitle className="text-base">Delivery address</CardTitle></CardHeader>
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
            <Card><CardContent className="p-4 text-sm text-muted-foreground">Waiting for the buyer to submit a delivery address before you can ship.</CardContent></Card>
          )}

          {canMarkShipped && (
            <Card>
              <CardHeader><CardTitle className="text-base">Mark as shipped</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Input placeholder="Carrier (e.g. Royal Mail)" value={carrier} onChange={(e) => setCarrier(e.target.value)} />
                <Input placeholder="Tracking number" value={tracking} onChange={(e) => setTracking(e.target.value)} />
                <Button onClick={() => markShipped.mutate({ tracking, carrier })} disabled={markShipped.isPending || !tracking || !carrier}>
                  {markShipped.isPending ? "Saving..." : "Mark as shipped"}
                </Button>
              </CardContent>
            </Card>
          )}

          {canConfirmReceipt && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <p className="text-sm">Received your card? Confirming releases payment to the seller.</p>
                <Button onClick={() => confirmReceipt.mutate()} disabled={confirmReceipt.isPending}>
                  {confirmReceipt.isPending ? "Confirming..." : "Confirm receipt"}
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2 flex-wrap">
            {canCancel && (
              <Button variant="outline" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
                Cancel order
              </Button>
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

export default OrderDetail;
