import React from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Filter, 
  SortAsc, 
  SortDesc, 
  DollarSign, 
  Star, 
  Zap, 
  Crown,
  X,
  TrendingUp,
  TrendingDown
} from "lucide-react";

export interface FilterOptions {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  rarityFilter: string;
  valueRange: string;
  typeFilter: string;
}

interface CardFiltersProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  resultCount?: number;
}

const RARITY_OPTIONS = [
  { value: "all", label: "All Rarities", icon: Star },
  { value: "common", label: "Common", icon: Star },
  { value: "uncommon", label: "Uncommon", icon: Star },
  { value: "rare", label: "Rare", icon: Star },
  { value: "rare-holo", label: "Rare Holo", icon: Star },
  { value: "ultra-rare", label: "Ultra Rare", icon: Crown },
  { value: "secret-rare", label: "Secret Rare", icon: Crown },
  { value: "legendary", label: "Legendary", icon: Crown },
  { value: "radiant", label: "Radiant", icon: Crown },
  { value: "amazing", label: "Amazing Rare", icon: Crown },
];

const VALUE_RANGES = [
  { value: "all", label: "All Values" },
  { value: "under-1", label: "Under £1" },
  { value: "1-5", label: "£1 - £5" },
  { value: "5-20", label: "£5 - £20" },
  { value: "20-50", label: "£20 - £50" },
  { value: "50-100", label: "£50 - £100" },
  { value: "over-100", label: "Over £100" },
];

const SORT_OPTIONS = [
  { value: "value", label: "Market Value", icon: DollarSign },
  { value: "rarity", label: "Rarity", icon: Star },
  { value: "name", label: "Name (A-Z)", icon: SortAsc },
  { value: "number", label: "Card Number", icon: SortAsc },
  { value: "release", label: "Release Date", icon: SortAsc },
];

const TYPE_FILTERS = [
  { value: "all", label: "All Types" },
  { value: "grass", label: "Grass" },
  { value: "fire", label: "Fire" },
  { value: "water", label: "Water" },
  { value: "lightning", label: "Lightning" },
  { value: "psychic", label: "Psychic" },
  { value: "fighting", label: "Fighting" },
  { value: "darkness", label: "Darkness" },
  { value: "metal", label: "Metal" },
  { value: "fairy", label: "Fairy" },
  { value: "dragon", label: "Dragon" },
  { value: "colorless", label: "Colorless" },
];

const CardFilters = ({ filters, onFiltersChange, resultCount }: CardFiltersProps) => {
  const updateFilter = (key: keyof FilterOptions, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const toggleSortOrder = () => {
    onFiltersChange({
      ...filters,
      sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc'
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      sortBy: "value",
      sortOrder: "desc",
      rarityFilter: "all",
      valueRange: "all",
      typeFilter: "all"
    });
  };

  const hasActiveFilters = filters.rarityFilter !== "all" || 
                          filters.valueRange !== "all" || 
                          filters.typeFilter !== "all" ||
                          filters.sortBy !== "value" ||
                          filters.sortOrder !== "desc";

  const getCurrentSortIcon = () => {
    const option = SORT_OPTIONS.find(opt => opt.value === filters.sortBy);
    return option?.icon || SortAsc;
  };

  const SortIcon = getCurrentSortIcon();

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex flex-col space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Filters & Sorting</h3>
              {resultCount !== undefined && (
                <Badge variant="secondary">{resultCount} cards</Badge>
              )}
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>

          {/* Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Sort By */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Sort by</label>
              <div className="flex gap-1">
                <Select value={filters.sortBy} onValueChange={(value) => updateFilter('sortBy', value)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map(option => {
                      const Icon = option.icon;
                      return (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {option.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={toggleSortOrder}
                  className="shrink-0"
                >
                  {filters.sortOrder === 'desc' ? (
                    <TrendingDown className="h-4 w-4" />
                  ) : (
                    <TrendingUp className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Rarity Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Rarity</label>
              <Select value={filters.rarityFilter} onValueChange={(value) => updateFilter('rarityFilter', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RARITY_OPTIONS.map(option => {
                    const Icon = option.icon;
                    return (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {option.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Value Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Value Range</label>
              <Select value={filters.valueRange} onValueChange={(value) => updateFilter('valueRange', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VALUE_RANGES.map(range => (
                    <SelectItem key={range.value} value={range.value}>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        {range.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Type Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select value={filters.typeFilter} onValueChange={(value) => updateFilter('typeFilter', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_FILTERS.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quick Filter Badges */}
          {filters.sortBy === "value" && filters.sortOrder === "desc" && (
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <TrendingDown className="h-3 w-3" />
                Highest Value First
              </Badge>
            </div>
          )}

          {filters.rarityFilter !== "all" && (
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <Star className="h-3 w-3" />
                {RARITY_OPTIONS.find(r => r.value === filters.rarityFilter)?.label}
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CardFilters;