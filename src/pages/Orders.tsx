import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import GlassCard from "@/components/ui/custom/GlassCard";
import { PackageOpen } from "lucide-react";
import { getMyOrders, OrderSummary, OrderStatus } from "@/services/orderService";

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

const OrderRow = ({ order }: { order: OrderSummary }) => (
  <Link to={`/orders/${order.id}`}>
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="w-14 h-20 rounded overflow-hidden bg-muted shrink-0">
          {order.image_url && (
            <img src={order.image_url} alt={order.card_name} className="w-full h-full object-cover" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate">{order.card_name}</h3>
          <p className="text-sm text-muted-foreground">
            {order.currency.toUpperCase()} {order.total_charged_amount.toFixed(2)} · {new Date(order.created_at).toLocaleDateString()}
          </p>
        </div>
        <Badge variant={statusVariant[order.status]}>{statusLabel[order.status]}</Badge>
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

const Orders = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["my-orders"],
    queryFn: getMyOrders,
  });

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
                <TabsTrigger value="buying">Buying ({data?.asBuyer.length ?? 0})</TabsTrigger>
                <TabsTrigger value="selling">Selling ({data?.asSeller.length ?? 0})</TabsTrigger>
              </TabsList>
              <TabsContent value="buying" className="space-y-3 mt-4">
                {data?.asBuyer.length ? (
                  data.asBuyer.map((o) => <OrderRow key={o.id} order={o} />)
                ) : (
                  <EmptyState message="You haven't bought any cards yet. Browse the marketplace to find one." />
                )}
              </TabsContent>
              <TabsContent value="selling" className="space-y-3 mt-4">
                {data?.asSeller.length ? (
                  data.asSeller.map((o) => <OrderRow key={o.id} order={o} />)
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
