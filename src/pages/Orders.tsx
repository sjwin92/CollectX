import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import GlassCard from "@/components/ui/custom/GlassCard";
import { PackageOpen, BadgeCheck } from "lucide-react";
import { getMyOrders, OrderSummary, OrderStatus } from "@/services/orderService";
import { getMyStoreOrders, StoreOrderSummary } from "@/services/storeOrderService";

const statusLabel: Record<OrderStatus, string> = {
  pending_payment: "Awaiting payment",
  paid_held: "Paid — awaiting shipment",
  shipped: "Shipped",
  completed: "Completed",
  refunded: "Refunded",
  cancelled: "Cancelled",
  disputed: "Disputed",
};

const statusVariant: Record<OrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending_payment: "outline",
  paid_held: "secondary",
  shipped: "secondary",
  completed: "default",
  refunded: "destructive",
  cancelled: "destructive",
  disputed: "destructive",
};

type Row = {
  key: string;
  to: string;
  card_name: string;
  image_url: string | null;
  currency: string;
  total: number;
  created_at: string;
  status: OrderStatus;
  isStore: boolean;
};

const toRow = (o: OrderSummary): Row => ({
  key: `o-${o.id}`,
  to: `/orders/${o.id}`,
  card_name: o.card_name,
  image_url: o.image_url,
  currency: o.currency,
  total: o.total_charged_amount,
  created_at: o.created_at,
  status: o.status,
  isStore: false,
});

const toStoreRow = (o: StoreOrderSummary): Row => ({
  key: `so-${o.id}`,
  to: `/store-orders/${o.id}`,
  card_name: o.card_name,
  image_url: o.image_url,
  currency: o.currency,
  total: o.total_charged_amount,
  created_at: o.created_at,
  status: o.status,
  isStore: true,
});

const OrderRow = ({ row }: { row: Row }) => (
  <Link to={row.to}>
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="w-14 h-20 rounded overflow-hidden bg-muted shrink-0">
          {row.image_url && (
            <img src={row.image_url} alt={row.card_name} className="w-full h-full object-cover" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate flex items-center gap-1.5">
            {row.card_name}
            {row.isStore && <BadgeCheck className="h-4 w-4 text-primary shrink-0" aria-label="Store order" />}
          </h3>
          <p className="text-sm text-muted-foreground">
            {row.currency.toUpperCase()} {row.total.toFixed(2)} · {new Date(row.created_at).toLocaleDateString()}
          </p>
        </div>
        <Badge variant={statusVariant[row.status]}>{statusLabel[row.status]}</Badge>
      </CardContent>
    </Card>
  </Link>
);

const EmptyState = ({ message }: { message: string }) => (
  <GlassCard className="p-8 text-center">
    <PackageOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
    <p className="text-muted-foreground">{message}</p>
  </GlassCard>
);

const byNewest = (a: Row, b: Row) => +new Date(b.created_at) - +new Date(a.created_at);

const Orders = () => {
  const { data, isLoading } = useQuery({ queryKey: ["my-orders"], queryFn: getMyOrders });
  const { data: storeData } = useQuery({ queryKey: ["my-store-orders"], queryFn: getMyStoreOrders });

  const buying: Row[] = [
    ...(data?.asBuyer ?? []).map(toRow),
    ...(storeData?.asBuyer ?? []).map(toStoreRow),
  ].sort(byNewest);
  const selling: Row[] = [
    ...(data?.asSeller ?? []).map(toRow),
    ...(storeData?.asSeller ?? []).map(toStoreRow),
  ].sort(byNewest);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">My Orders</h1>
            <p className="text-muted-foreground">Track cards you're buying and selling for cash</p>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading your orders...</p>
            </div>
          ) : (
            <Tabs defaultValue="buying">
              <TabsList>
                <TabsTrigger value="buying">Buying ({buying.length})</TabsTrigger>
                <TabsTrigger value="selling">Selling ({selling.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="buying" className="space-y-3 mt-4">
                {buying.length ? (
                  buying.map((r) => <OrderRow key={r.key} row={r} />)
                ) : (
                  <EmptyState message="You haven't bought any cards yet. Browse the marketplace to find one." />
                )}
              </TabsContent>
              <TabsContent value="selling" className="space-y-3 mt-4">
                {selling.length ? (
                  selling.map((r) => <OrderRow key={r.key} row={r} />)
                ) : (
                  <EmptyState message="No sales yet. List a card for sale in the marketplace to get started." />
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Orders;
