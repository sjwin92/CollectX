
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowLeftRight, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ReputationBadge from './ReputationBadge';
import { getConsistentCardImageUrl } from '@/services/api/cardImageService';
import GlassCard from '@/components/ui/custom/GlassCard';

interface LiveTradeData {
  id: string;
  status: "completed" | "proposed" | "accepted" | "shipped";
  date: string;
  user: {
    id: string;
    name: string;
    reputation: "trusted" | "established" | "new";
  };
  giving: {
    count: number;
    cardId: string;
    cardName: string;
  };
  receiving: {
    count: number;
    cardId: string;
    cardName: string;
  };
}

const LiveTradeFeed = () => {
  const [currentTradeIndex, setCurrentTradeIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  // Mock live trade data - in a real app, this would come from an API
  const liveTradeData: LiveTradeData[] = [
    {
      id: "lt1",
      status: "completed",
      date: "2 minutes ago",
      user: {
        id: "u1",
        name: "Alex Morgan",
        reputation: "trusted"
      },
      giving: {
        count: 2,
        cardId: "swsh4-25",
        cardName: "Pikachu V"
      },
      receiving: {
        count: 1,
        cardId: "swsh1-190",
        cardName: "Charizard VMAX"
      }
    },
    {
      id: "lt2",
      status: "completed",
      date: "8 minutes ago",
      user: {
        id: "u2",
        name: "Jordan Lee",
        reputation: "established"
      },
      giving: {
        count: 1,
        cardId: "swsh9-25",
        cardName: "Charizard V"
      },
      receiving: {
        count: 3,
        cardId: "sm12-222",
        cardName: "Reshiram & Charizard GX"
      }
    },
    {
      id: "lt3",
      status: "completed",
      date: "15 minutes ago",
      user: {
        id: "u3",
        name: "Sarah Chen",
        reputation: "trusted"
      },
      giving: {
        count: 1,
        cardId: "sv1-1",
        cardName: "Sprigatito"
      },
      receiving: {
        count: 2,
        cardId: "sv2-150",
        cardName: "Miraidon ex"
      }
    },
    {
      id: "lt4",
      status: "completed",
      date: "22 minutes ago",
      user: {
        id: "u4",
        name: "Mike Johnson",
        reputation: "established"
      },
      giving: {
        count: 3,
        cardId: "swsh11-196",
        cardName: "Giratina V"
      },
      receiving: {
        count: 1,
        cardId: "sv3-230",
        cardName: "Charizard ex"
      }
    },
    {
      id: "lt5",
      status: "completed",
      date: "35 minutes ago",
      user: {
        id: "u5",
        name: "Emma Davis",
        reputation: "trusted"
      },
      giving: {
        count: 1,
        cardId: "swsh12-195",
        cardName: "Lugia VSTAR"
      },
      receiving: {
        count: 2,
        cardId: "sv4-182",
        cardName: "Iron Valiant ex"
      }
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false);
      
      setTimeout(() => {
        setCurrentTradeIndex((prevIndex) => 
          (prevIndex + 1) % liveTradeData.length
        );
        setIsVisible(true);
      }, 500); // Wait for fade out before changing content
    }, 20000); // Change every 20 seconds

    return () => clearInterval(interval);
  }, [liveTradeData.length]);

  const currentTrade = liveTradeData[currentTradeIndex];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2">Live Trading Activity</h2>
          <p className="text-muted-foreground">
            See the latest successful trades happening on the platform in real-time
          </p>
        </div>
        <Button variant="ghost" className="hidden md:flex" asChild>
          <Link to="/trades" className="flex items-center gap-1">
            All Trades <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div 
        className={`transition-opacity duration-500 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <GlassCard className="overflow-hidden p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src="/placeholder.svg" alt={currentTrade.user.name} />
                <AvatarFallback>
                  {currentTrade.user.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{currentTrade.user.name}</span>
                  <ReputationBadge reputation={currentTrade.user.reputation} size="sm" />
                </div>
                <div className="flex items-center text-xs text-muted-foreground gap-1 mt-0.5">
                  {getStatusIcon(currentTrade.status)}
                  <span>Trade completed {currentTrade.date}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="col-span-2">
              <div className="text-xs text-muted-foreground mb-2">Traded away:</div>
              <div className="flex items-center gap-3">
                <div className="relative h-16 w-16 rounded-md overflow-hidden bg-muted">
                  <img 
                    src={getConsistentCardImageUrl(currentTrade.giving.cardId)} 
                    alt={currentTrade.giving.cardName}
                    className="object-cover h-full w-full"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "https://archives.bulbagarden.net/media/upload/1/17/Cardback.jpg";
                    }}
                  />
                  {currentTrade.giving.count > 1 && (
                    <div className="absolute top-1 right-1 bg-primary/90 text-white text-xs font-medium h-5 w-5 rounded-full flex items-center justify-center">
                      {currentTrade.giving.count}
                    </div>
                  )}
                </div>
                <div>
                  <div className="font-medium text-sm">{currentTrade.giving.cardName}</div>
                  {currentTrade.giving.count > 1 && (
                    <div className="text-xs text-muted-foreground">
                      {currentTrade.giving.count} cards
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="col-span-1 flex items-center justify-center">
              <ArrowLeftRight className="h-6 w-6 text-muted-foreground animate-pulse" />
            </div>
            
            <div className="col-span-2">
              <div className="text-xs text-muted-foreground mb-2">Received:</div>
              <div className="flex items-center gap-3">
                <div className="relative h-16 w-16 rounded-md overflow-hidden bg-muted">
                  <img 
                    src={getConsistentCardImageUrl(currentTrade.receiving.cardId)} 
                    alt={currentTrade.receiving.cardName}
                    className="object-cover h-full w-full"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "https://archives.bulbagarden.net/media/upload/1/17/Cardback.jpg";
                    }}
                  />
                  {currentTrade.receiving.count > 1 && (
                    <div className="absolute top-1 right-1 bg-primary/90 text-white text-xs font-medium h-5 w-5 rounded-full flex items-center justify-center">
                      {currentTrade.receiving.count}
                    </div>
                  )}
                </div>
                <div>
                  <div className="font-medium text-sm">{currentTrade.receiving.cardName}</div>
                  {currentTrade.receiving.count > 1 && (
                    <div className="text-xs text-muted-foreground">
                      {currentTrade.receiving.count} cards
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex space-x-1">
                {liveTradeData.map((_, index) => (
                  <div
                    key={index}
                    className={`h-1.5 w-1.5 rounded-full transition-colors ${
                      index === currentTradeIndex ? 'bg-primary' : 'bg-muted-foreground/30'
                    }`}
                  />
                ))}
              </div>
              <span>Live Feed</span>
            </div>
            <Link to={`/trades/${currentTrade.id}`}>
              <Button size="sm" variant="outline">View Details</Button>
            </Link>
          </div>
        </GlassCard>
      </div>

      <div className="text-center md:hidden">
        <Button asChild>
          <Link to="/trades">View All Trades</Link>
        </Button>
      </div>
    </div>
  );
};

export default LiveTradeFeed;
