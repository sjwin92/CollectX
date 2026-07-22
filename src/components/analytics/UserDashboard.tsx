import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/hooks/useUser";
import { getUserStats } from "@/services/supabaseAnalyticsService";
import { BarChart3 } from "lucide-react";

const UserDashboard = () => {
  const { user } = useUser();

  const { data: userStats } = useQuery({
    queryKey: ['user-stats', user?.id],
    queryFn: () => getUserStats(),
    enabled: !!user
  });

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              Please sign in to view your dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Dashboard</h1>
      </div>

      {userStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Cards</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats.total_cards}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats.total_trades}</div>
              <p className="text-xs text-muted-foreground">
                {userStats.completed_trades} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Listings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats.total_listings}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Reputation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats.reputation_score}</div>
              <p className="text-xs text-muted-foreground">
                Member since {new Date(userStats.join_date).getFullYear()}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default UserDashboard;
