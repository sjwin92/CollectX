import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/hooks/useUser";
import {
  getUserStats,
  getTrendingCards,
  getUserActivity,
  getPopularSearches,
  type UserStats,
  type TrendingCard,
  type UserActivity
} from "@/services/supabaseAnalyticsService";
import { formatDistanceToNow } from "date-fns";
import { Activity, TrendingUp, Search, BarChart3 } from "lucide-react";

const UserDashboard = () => {
  const { user } = useUser();

  // Get user stats
  const { data: userStats } = useQuery({
    queryKey: ['user-stats', user?.id],
    queryFn: () => getUserStats(),
    enabled: !!user
  });

  // Get trending cards
  const { data: trendingCards = [] } = useQuery({
    queryKey: ['trending-cards'],
    queryFn: () => getTrendingCards(7),
    enabled: !!user
  });

  // Get user activity
  const { data: userActivity = [] } = useQuery({
    queryKey: ['user-activity'],
    queryFn: () => getUserActivity(20),
    enabled: !!user
  });

  // Get popular searches
  const { data: popularSearches = [] } = useQuery({
    queryKey: ['popular-searches'],
    queryFn: () => getPopularSearches('cards', 10, 7),
    enabled: !!user
  });

  const getActivityIcon = (activityType: UserActivity['activity_type']) => {
    switch (activityType) {
      case 'card_view':
      case 'card_add':
        return '🃏';
      case 'trade_propose':
      case 'trade_accept':
      case 'trade_decline':
        return '🔄';
      case 'listing_create':
      case 'listing_view':
        return '🏪';
      case 'search':
        return '🔍';
      case 'profile_update':
        return '👤';
      default:
        return '📊';
    }
  };

  const getActivityDescription = (activity: UserActivity) => {
    const data = activity.activity_data || {};
    
    switch (activity.activity_type) {
      case 'card_view':
        return `Viewed ${data.card_name || 'a card'}`;
      case 'card_add':
        return `Added ${data.quantity || 1}x ${data.card_name || 'card'} to collection`;
      case 'trade_propose':
        return 'Proposed a trade';
      case 'trade_accept':
        return 'Accepted a trade';
      case 'trade_decline':
        return 'Declined a trade';
      case 'listing_create':
        return `Listed ${data.card_name || 'a card'} for ${data.listing_type || 'trade'}`;
      case 'listing_view':
        return `Viewed listing for ${data.card_name || 'a card'}`;
      case 'search':
        return `Searched for "${data.query || 'cards'}"`;
      case 'profile_update':
        return 'Updated profile';
      case 'collection_export':
        return 'Exported collection data';
      default:
        return activity.activity_type.replace('_', ' ');
    }
  };

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

      {/* Stats Overview */}
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

      <Tabs defaultValue="activity" className="space-y-4">
        <TabsList>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Recent Activity
          </TabsTrigger>
          <TabsTrigger value="trending" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Trending Cards
          </TabsTrigger>
          <TabsTrigger value="searches" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Popular Searches
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your latest actions on the platform</CardDescription>
            </CardHeader>
            <CardContent>
              {userActivity.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No recent activity found.
                </p>
              ) : (
                <div className="space-y-4">
                  {userActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center gap-3 p-3 bg-muted rounded-lg"
                    >
                      <div className="text-2xl">
                        {getActivityIcon(activity.activity_type)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {getActivityDescription(activity)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {activity.activity_type.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trending">
          <Card>
            <CardHeader>
              <CardTitle>Trending Cards</CardTitle>
              <CardDescription>Most viewed and searched cards this week</CardDescription>
            </CardHeader>
            <CardContent>
              {trendingCards.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No trending data available yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {trendingCards.map((card, index) => (
                    <div
                      key={card.card_name}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="w-8 h-8 rounded-full flex items-center justify-center">
                          {index + 1}
                        </Badge>
                        <div>
                          <p className="font-medium">{card.card_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {card.search_count + card.view_count} total interactions
                          </p>
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <p>{card.search_count} searches</p>
                        <p className="text-muted-foreground">{card.view_count} views</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="searches">
          <Card>
            <CardHeader>
              <CardTitle>Popular Searches</CardTitle>
              <CardDescription>Most popular card searches this week</CardDescription>
            </CardHeader>
            <CardContent>
              {popularSearches.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No search data available yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {popularSearches.map((search, index) => (
                    <div
                      key={search.search_query}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="w-8 h-8 rounded-full flex items-center justify-center">
                          {index + 1}
                        </Badge>
                        <p className="font-medium">{search.search_query}</p>
                      </div>
                      <Badge variant="outline">
                        {search.count} searches
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserDashboard;