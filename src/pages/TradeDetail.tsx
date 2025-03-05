
import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import GlassCard from "@/components/ui/custom/GlassCard";
import Badge from "@/components/ui/custom/Badge";
import EscrowDetails from "@/components/trades/EscrowDetails";
import { ArrowLeft, MessageCircle, Send, Shield, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Mock data for demo
const mockTradeData = {
  id: "trade-123",
  status: "accepted" as const,
  createdAt: "2023-05-15T10:30:00Z",
  updatedAt: "2023-05-16T14:22:00Z",
  initiator: {
    userId: "user-1",
    username: "Alex Morgan",
    reputation: "trusted" as const,
    tradeCount: 47,
    successRate: 98.5,
    offeringCards: [
      {
        id: "card-1",
        name: "Charizard GX Rainbow Rare",
        imageUrl: "https://images.unsplash.com/photo-1605979257913-1704eb7b6246?q=80&w=1470&auto=format&fit=crop",
        condition: "Near Mint",
        estimatedValue: 350,
        currency: "USD"
      },
      {
        id: "card-2",
        name: "Pikachu V-Max",
        imageUrl: "https://images.unsplash.com/photo-1607736703050-d0666c1d1278?q=80&w=1470&auto=format&fit=crop",
        condition: "Mint",
        estimatedValue: 120,
        currency: "USD"
      }
    ],
    escrowAmount: {
      baseAmount: 470,
      reputationDiscount: 235,
      finalAmount: 235,
      currency: "USD"
    }
  },
  recipient: {
    userId: "user-2",
    username: "Jordan Lee",
    reputation: "established" as const,
    tradeCount: 23,
    successRate: 96.0,
    offeringCards: [
      {
        id: "card-3",
        name: "Mewtwo EX",
        imageUrl: "https://images.unsplash.com/photo-1613771404721-1f92d799e49f?q=80&w=1469&auto=format&fit=crop",
        condition: "Excellent",
        estimatedValue: 200,
        currency: "USD"
      },
      {
        id: "card-4",
        name: "Blastoise Holo",
        imageUrl: "https://images.unsplash.com/photo-1638075528746-8b5f9c2b6c9c?q=80&w=1480&auto=format&fit=crop",
        condition: "Good",
        estimatedValue: 80,
        currency: "USD"
      },
      {
        id: "card-5",
        name: "Venusaur V",
        imageUrl: "https://images.unsplash.com/photo-1539771340300-015110ffb6f7?q=80&w=1450&auto=format&fit=crop",
        condition: "Near Mint",
        estimatedValue: 150,
        currency: "USD"
      }
    ],
    escrowAmount: {
      baseAmount: 430,
      reputationDiscount: 107.5,
      finalAmount: 322.5,
      currency: "USD"
    }
  },
  escrow: {
    id: "escrow-123",
    tradeId: "trade-123",
    status: "accepted" as const,
    initiatorId: "user-1",
    recipientId: "user-2",
    initiatorEscrowAmount: {
      baseAmount: 470,
      reputationDiscount: 235,
      finalAmount: 235,
      currency: "USD"
    },
    recipientEscrowAmount: {
      baseAmount: 430,
      reputationDiscount: 107.5,
      finalAmount: 322.5,
      currency: "USD"
    },
    initiatorPaid: false,
    recipientPaid: false,
    createdAt: "2023-05-16T14:22:00Z",
    updatedAt: "2023-05-16T14:22:00Z",
  },
  messages: [
    {
      id: "msg-1",
      tradeId: "trade-123",
      userId: "user-1",
      username: "Alex Morgan",
      message: "Hi, I'm interested in trading my Charizard and Pikachu for your Mewtwo, Blastoise, and Venusaur.",
      createdAt: "2023-05-15T10:30:00Z",
      systemMessage: false
    },
    {
      id: "msg-2",
      tradeId: "trade-123",
      userId: "user-2",
      username: "Jordan Lee",
      message: "That sounds like a fair trade. I accept your offer.",
      createdAt: "2023-05-16T09:15:00Z",
      systemMessage: false
    },
    {
      id: "msg-3",
      tradeId: "trade-123",
      userId: "system",
      username: "System",
      message: "Trade accepted. Both parties must pay the required escrow amount to proceed.",
      createdAt: "2023-05-16T14:22:00Z",
      systemMessage: true
    }
  ]
};

const TradeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  // In a real app, we would fetch the trade data based on the ID
  const tradeData = mockTradeData;
  const isInitiator = true; // For demo, assuming current user is the initiator
  
  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    // In a real app, we would send the message to the API
    toast({
      title: "Message sent",
      description: "Your message has been sent successfully"
    });
    
    setNewMessage("");
  };
  
  const handlePayEscrow = () => {
    setShowPaymentModal(true);
  };
  
  const handleProcessPayment = () => {
    // In a real app, we would process the payment through a payment gateway
    setShowPaymentModal(false);
    
    toast({
      title: "Escrow payment successful",
      description: "Your escrow payment has been processed successfully"
    });
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <div className="container py-8 flex-grow">
        <div className="mb-6">
          <Link to="/trades" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Trades</span>
          </Link>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <GlassCard>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">Trade #{id}</h1>
                <Badge variant={
                  tradeData.status === "completed" ? "success" :
                  tradeData.status === "declined" || tradeData.status === "disputed" || tradeData.status === "cancelled" ? "danger" :
                  "info"
                }>
                  {tradeData.status.charAt(0).toUpperCase() + tradeData.status.slice(1)}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar>
                      <AvatarFallback>
                        {tradeData.initiator.username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{tradeData.initiator.username}</span>
                        <Badge variant="reputation" reputation={tradeData.initiator.reputation} size="sm">
                          {tradeData.initiator.reputation.charAt(0).toUpperCase() + tradeData.initiator.reputation.slice(1)}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {tradeData.initiator.tradeCount} trades • {tradeData.initiator.successRate}% success
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="text-sm font-medium mb-2">Offering:</div>
                    {tradeData.initiator.offeringCards.map(card => (
                      <div key={card.id} className="flex items-center gap-3 p-3 rounded-md bg-secondary/20">
                        <div className="h-14 w-14 rounded-md overflow-hidden bg-muted">
                          <img 
                            src={card.imageUrl} 
                            alt={card.name} 
                            className="object-cover h-full w-full"
                          />
                        </div>
                        <div>
                          <div className="text-sm font-medium">{card.name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" size="sm">{card.condition}</Badge>
                            <span className="text-xs font-medium">
                              {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: card.currency
                              }).format(card.estimatedValue)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar>
                      <AvatarFallback>
                        {tradeData.recipient.username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{tradeData.recipient.username}</span>
                        <Badge variant="reputation" reputation={tradeData.recipient.reputation} size="sm">
                          {tradeData.recipient.reputation.charAt(0).toUpperCase() + tradeData.recipient.reputation.slice(1)}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {tradeData.recipient.tradeCount} trades • {tradeData.recipient.successRate}% success
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="text-sm font-medium mb-2">Offering:</div>
                    {tradeData.recipient.offeringCards.map(card => (
                      <div key={card.id} className="flex items-center gap-3 p-3 rounded-md bg-secondary/20">
                        <div className="h-14 w-14 rounded-md overflow-hidden bg-muted">
                          <img 
                            src={card.imageUrl} 
                            alt={card.name} 
                            className="object-cover h-full w-full"
                          />
                        </div>
                        <div>
                          <div className="text-sm font-medium">{card.name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" size="sm">{card.condition}</Badge>
                            <span className="text-xs font-medium">
                              {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: card.currency
                              }).format(card.estimatedValue)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div>Created: {formatDate(tradeData.createdAt)}</div>
                <div>Last updated: {formatDate(tradeData.updatedAt)}</div>
              </div>
            </GlassCard>
            
            {/* Escrow Details */}
            {tradeData.escrow && (
              <EscrowDetails
                escrow={tradeData.escrow}
                isInitiator={isInitiator}
                onPayEscrow={handlePayEscrow}
              />
            )}
            
            {/* Trade Messages */}
            <GlassCard>
              <div className="flex items-center gap-2 mb-4">
                <MessageCircle className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-medium">Messages</h2>
              </div>
              
              <div className="h-[300px] overflow-y-auto mb-4 space-y-4 pr-2">
                {tradeData.messages.map((message) => (
                  <div 
                    key={message.id} 
                    className={`flex ${message.systemMessage ? 'justify-center' : message.userId === (isInitiator ? tradeData.initiator.userId : tradeData.recipient.userId) ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`max-w-[80%] p-3 rounded-lg ${
                        message.systemMessage 
                          ? 'bg-secondary/30 text-center w-full' 
                          : message.userId === (isInitiator ? tradeData.initiator.userId : tradeData.recipient.userId)
                            ? 'bg-primary/10 text-foreground' 
                            : 'bg-secondary/30 text-foreground'
                      }`}
                    >
                      {!message.systemMessage && (
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium">{message.username}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(message.createdAt)}
                          </span>
                        </div>
                      )}
                      <div className={`${message.systemMessage ? 'text-xs text-muted-foreground italic' : 'text-sm'}`}>
                        {message.message}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 bg-secondary/20 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <Button size="sm" onClick={handleSendMessage}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </GlassCard>
          </div>
          
          <div className="space-y-6">
            {/* Trade Summary */}
            <GlassCard>
              <h2 className="text-lg font-medium mb-4">Trade Summary</h2>
              
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <span className="text-sm font-medium">{tradeData.status.charAt(0).toUpperCase() + tradeData.status.slice(1)}</span>
                </div>
                
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Your Cards</span>
                  <span className="text-sm font-medium">{isInitiator ? tradeData.initiator.offeringCards.length : tradeData.recipient.offeringCards.length}</span>
                </div>
                
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Their Cards</span>
                  <span className="text-sm font-medium">{isInitiator ? tradeData.recipient.offeringCards.length : tradeData.initiator.offeringCards.length}</span>
                </div>
                
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Your Total Value</span>
                  <span className="text-sm font-medium">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD'
                    }).format(isInitiator 
                      ? tradeData.initiator.offeringCards.reduce((sum, card) => sum + card.estimatedValue, 0)
                      : tradeData.recipient.offeringCards.reduce((sum, card) => sum + card.estimatedValue, 0)
                    )}
                  </span>
                </div>
                
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Their Total Value</span>
                  <span className="text-sm font-medium">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD'
                    }).format(isInitiator 
                      ? tradeData.recipient.offeringCards.reduce((sum, card) => sum + card.estimatedValue, 0)
                      : tradeData.initiator.offeringCards.reduce((sum, card) => sum + card.estimatedValue, 0)
                    )}
                  </span>
                </div>
                
                <div className="flex justify-between py-2">
                  <span className="text-sm text-muted-foreground">Escrow Required</span>
                  <span className="text-sm font-medium">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD'
                    }).format(isInitiator 
                      ? tradeData.escrow.initiatorEscrowAmount.finalAmount
                      : tradeData.escrow.recipientEscrowAmount.finalAmount
                    )}
                  </span>
                </div>
              </div>
            </GlassCard>
            
            {/* Actions */}
            <GlassCard>
              <h2 className="text-lg font-medium mb-4">Actions</h2>
              
              <div className="space-y-3">
                {tradeData.status === "accepted" && (
                  <Button className="w-full" onClick={handlePayEscrow}>
                    Pay Escrow
                  </Button>
                )}
                
                {tradeData.status === "escrowed" && (
                  <Button className="w-full">
                    <Upload className="h-4 w-4 mr-2" />
                    Add Shipping Info
                  </Button>
                )}
                
                {tradeData.status === "shipped" && (
                  <Button className="w-full">
                    Confirm Receipt
                  </Button>
                )}
                
                {["proposed", "accepted", "processing"].includes(tradeData.status) && (
                  <Button variant="outline" className="w-full">
                    Cancel Trade
                  </Button>
                )}
                
                {["shipped", "received"].includes(tradeData.status) && (
                  <Button variant="destructive" className="w-full">
                    Report Issue
                  </Button>
                )}
              </div>
              
              <div className="flex items-center justify-center gap-2 mt-6 p-3 border border-primary/20 rounded-md bg-primary/5">
                <Shield className="h-5 w-5 text-primary" />
                <span className="text-sm">All trades are protected by CollectX Escrow</span>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
      
      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <GlassCard className="w-full max-w-md m-4">
            <h2 className="text-xl font-bold mb-4">Pay Escrow</h2>
            
            <div className="space-y-4 mb-6">
              <div className="p-4 border border-border rounded-md bg-secondary/20">
                <div className="text-sm text-muted-foreground mb-1">Escrow Amount:</div>
                <div className="text-2xl font-bold">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD'
                  }).format(isInitiator 
                    ? tradeData.escrow.initiatorEscrowAmount.finalAmount
                    : tradeData.escrow.recipientEscrowAmount.finalAmount
                  )}
                </div>
                {(isInitiator 
                  ? tradeData.escrow.initiatorEscrowAmount.reputationDiscount 
                  : tradeData.escrow.recipientEscrowAmount.reputationDiscount
                ) > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    You saved {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD'
                    }).format(isInitiator 
                      ? tradeData.escrow.initiatorEscrowAmount.reputationDiscount
                      : tradeData.escrow.recipientEscrowAmount.reputationDiscount
                    )} due to your reputation!
                  </div>
                )}
              </div>
              
              {/* This would be replaced with a real payment form */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Card Number</label>
                  <input 
                    type="text" 
                    placeholder="4242 4242 4242 4242" 
                    className="w-full bg-secondary/20 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Expiry Date</label>
                    <input 
                      type="text" 
                      placeholder="MM/YY" 
                      className="w-full bg-secondary/20 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">CVV</label>
                    <input 
                      type="text" 
                      placeholder="123" 
                      className="w-full bg-secondary/20 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowPaymentModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleProcessPayment}>
                Pay Now
              </Button>
            </div>
          </GlassCard>
        </div>
      )}
      
      <Footer />
    </div>
  );
};

export default TradeDetail;
