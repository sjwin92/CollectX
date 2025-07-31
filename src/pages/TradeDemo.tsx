import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, MessageSquare, Camera, ArrowLeftRight } from 'lucide-react';
import TradeMessaging from '@/components/trades/TradeMessaging';
import CardImageUpload from '@/components/pokemon/collection/CardImageUpload';
import { useCardImages } from '@/hooks/useCardImages';
import { useUser } from '@/hooks/useUser';

// Mock trade data for demonstration
const mockTrade = {
  id: 'demo-trade-123',
  status: 'accepted',
  initiator_user_id: 'user1',
  recipient_user_id: 'user2',
  initiator_value: 150.00,
  recipient_value: 175.00,
  title: 'Charizard for Blastoise Trade',
  description: 'Trading my PSA 9 Charizard for your Blastoise collection',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const TradeDemo = () => {
  const { user } = useUser();
  const { images, handleImageUploaded, handleImageRemoved } = useCardImages('demo-card-charizard');
  const [activeTab, setActiveTab] = useState('overview');

  if (!user) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Sign In Required</h2>
            <p className="text-muted-foreground">
              Please sign in to view the trading features demo.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Trading Platform Demo</h1>
        <p className="text-muted-foreground">
          Experience our secure escrow system, real-time messaging, and card condition verification
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Feature Overview Cards */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-green-600" />
              Escrow Protection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Secure payments held in escrow until both parties confirm trade completion.
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Escrow Rate:</span>
                <span>5-10%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Release Time:</span>
                <span>Instant</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Dispute Support:</span>
                <Badge variant="secondary" className="text-xs">24/7</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              Real-time Chat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Communicate directly with other traders through our secure messaging system.
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Message History:</span>
                <span>Permanent</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Image Sharing:</span>
                <Badge variant="secondary" className="text-xs">Supported</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Notifications:</span>
                <Badge variant="secondary" className="text-xs">Real-time</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Camera className="h-5 w-5 text-purple-600" />
              Card Verification
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Upload photos of your cards to verify condition and authenticity.
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Max Images:</span>
                <span>3 per card</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>File Size:</span>
                <span>5MB max</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Storage:</span>
                <Badge variant="secondary" className="text-xs">Secure</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Demo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" />
            Live Trading Demo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Trade Overview</TabsTrigger>
              <TabsTrigger value="messaging">Chat & Escrow</TabsTrigger>
              <TabsTrigger value="verification">Card Photos</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Trade Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <h4 className="font-medium">{mockTrade.title}</h4>
                      <p className="text-sm text-muted-foreground">{mockTrade.description}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Your Offer:</span>
                        <div>${mockTrade.initiator_value.toFixed(2)}</div>
                      </div>
                      <div>
                        <span className="font-medium">Their Offer:</span>
                        <div>${mockTrade.recipient_value.toFixed(2)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Status:</span>
                      <Badge>{mockTrade.status}</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Next Steps</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-sm">Trade proposal accepted</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                        <span className="text-sm">Upload card verification photos</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                        <span className="text-sm">Initialize escrow protection</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                        <span className="text-sm">Ship cards with tracking</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="messaging" className="space-y-4">
              <TradeMessaging trade={mockTrade} />
            </TabsContent>

            <TabsContent value="verification" className="space-y-4">
              <div className="max-w-2xl mx-auto">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold mb-2">Card Condition Verification</h3>
                  <p className="text-muted-foreground">
                    Upload photos of your Charizard to help verify its condition for the trade
                  </p>
                </div>
                
                <CardImageUpload
                  cardId="demo-card-charizard"
                  userId={user.id}
                  existingImages={images}
                  onImageUploaded={handleImageUploaded}
                  onImageRemoved={handleImageRemoved}
                  maxImages={3}
                />
                
                {images.length > 0 && (
                  <div className="mt-6 text-center">
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      {images.length} verification photo{images.length !== 1 ? 's' : ''} uploaded
                    </Badge>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Call to Action */}
      <Card className="text-center">
        <CardContent className="pt-6">
          <h3 className="text-xl font-semibold mb-2">Ready to Start Trading?</h3>
          <p className="text-muted-foreground mb-4">
            Join thousands of collectors using our secure trading platform
          </p>
          <div className="flex justify-center gap-3">
            <Button asChild>
              <a href="/collection">View My Collection</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/marketplace">Browse Marketplace</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TradeDemo;