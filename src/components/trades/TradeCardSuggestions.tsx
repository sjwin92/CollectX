import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PokemonCard } from "@/services/pokemonTcgApi";
import { formatCurrency } from "@/utils/escrowCalculator";
import { estimateCardValue } from "@/services/valueEstimationService";
import { Sparkles, TrendingUp, Filter } from "lucide-react";

interface TradeCardSuggestionsProps {
  targetCard: any;
  userCollection: PokemonCard[];
  onSelectCard: (card: PokemonCard) => void;
}

const TradeCardSuggestions = ({ 
  targetCard, 
  userCollection, 
  onSelectCard 
}: TradeCardSuggestionsProps) => {
  const [eraFilter, setEraFilter] = useState<string>("all");
  const [valueRange, setValueRange] = useState<string>("similar");
  const [searchTerm, setSearchTerm] = useState("");

  const targetValue = parseFloat(targetCard.estimatedValue?.replace('$', '') || '0');

  const suggestedCards = useMemo(() => {
    if (!userCollection.length) return [];

    return userCollection
      .filter(card => {
        // Filter by search term
        if (searchTerm && !card.name.toLowerCase().includes(searchTerm.toLowerCase())) {
          return false;
        }

        // Filter by era
        if (eraFilter !== "all") {
          const setYear = card.set?.releaseDate ? new Date(card.set.releaseDate).getFullYear() : 0;
          switch (eraFilter) {
            case "classic":
              return setYear >= 1998 && setYear <= 2003;
            case "modern":
              return setYear >= 2017;
            case "vintage":
              return setYear >= 2004 && setYear <= 2016;
            default:
              return true;
          }
        }

        return true;
      })
      .map(card => ({
        ...card,
        estimatedValue: estimateCardValue({
          id: card.id,
          name: card.name,
          imageUrl: card.images.small,
          condition: "Near Mint",
          estimatedValue: 0,
          currency: "USD"
        })
      }))
      .filter(card => {
        // Filter by value range
        if (valueRange === "similar") {
          const valueDiff = Math.abs(card.estimatedValue - targetValue);
          return valueDiff <= targetValue * 0.3; // Within 30% of target value
        } else if (valueRange === "lower") {
          return card.estimatedValue < targetValue * 0.8;
        } else if (valueRange === "higher") {
          return card.estimatedValue > targetValue * 1.2;
        }
        return true;
      })
      .sort((a, b) => {
        // Sort by value similarity to target
        const aDiff = Math.abs(a.estimatedValue - targetValue);
        const bDiff = Math.abs(b.estimatedValue - targetValue);
        return aDiff - bDiff;
      })
      .slice(0, 12); // Limit to top 12 suggestions
  }, [userCollection, eraFilter, valueRange, searchTerm, targetValue]);

  const getValueBadgeColor = (cardValue: number) => {
    const diff = ((cardValue - targetValue) / targetValue) * 100;
    if (Math.abs(diff) <= 10) return "bg-green-500/10 text-green-500 border-green-500/20";
    if (Math.abs(diff) <= 30) return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    return "bg-red-500/10 text-red-500 border-red-500/20";
  };

  const getValueDifferenceText = (cardValue: number) => {
    const diff = ((cardValue - targetValue) / targetValue) * 100;
    if (diff > 0) return `+${diff.toFixed(0)}%`;
    return `${diff.toFixed(0)}%`;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Smart Trade Suggestions
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Cards from your collection that match well with {targetCard.name}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Search your cards..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[200px]"
          />
          <Select value={eraFilter} onValueChange={setEraFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Era" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Eras</SelectItem>
              <SelectItem value="classic">Classic (98-03)</SelectItem>
              <SelectItem value="vintage">Vintage (04-16)</SelectItem>
              <SelectItem value="modern">Modern (17+)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={valueRange} onValueChange={setValueRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Value" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="similar">Similar Value</SelectItem>
              <SelectItem value="lower">Lower Value</SelectItem>
              <SelectItem value="higher">Higher Value</SelectItem>
              <SelectItem value="all">All Values</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Suggested Cards Grid */}
        {suggestedCards.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {suggestedCards.map((card, index) => (
              <div
                key={`${card.id}-${index}`}
                className="relative group cursor-pointer rounded-lg overflow-hidden border hover:border-primary/50 transition-colors"
                onClick={() => onSelectCard(card)}
              >
                <div className="aspect-[3/4] relative">
                  <img
                    src={card.images.small}
                    alt={card.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/placeholder.svg";
                    }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  <div className="absolute top-2 right-2">
                    <Badge className={getValueBadgeColor(card.estimatedValue)}>
                      {getValueDifferenceText(card.estimatedValue)}
                    </Badge>
                  </div>
                </div>
                <div className="p-2 bg-background border-t">
                  <div className="text-xs font-medium truncate mb-1">{card.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center justify-between">
                    <span>{formatCurrency(card.estimatedValue, "USD")}</span>
                    <TrendingUp className="h-3 w-3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No matching cards found in your collection</p>
            <p className="text-xs">Try adjusting your filters</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TradeCardSuggestions;