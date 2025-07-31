import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Box, 
  Plus, 
  ChevronDown,
  ArrowRightLeft,
  Shield,
  TrendingUp,
  Star,
  Users,
  Package
} from "lucide-react";

interface CollectionBox {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  cardCount: number;
  totalValue: number;
}

interface CollectionBoxSelectorProps {
  onSelectBox: (boxId: string) => void;
  selectedBoxId?: string;
  disabled?: boolean;
}

const CollectionBoxSelector = ({ 
  onSelectBox, 
  selectedBoxId, 
  disabled = false 
}: CollectionBoxSelectorProps) => {
  // User's collection boxes (empty for fresh spawn)
  const collectionBoxes: CollectionBox[] = [];

  const getIconComponent = (iconName: string) => {
    const icons: { [key: string]: React.ComponentType<any> } = {
      ArrowRightLeft,
      Shield,
      TrendingUp,
      Star,
      Users,
      Package
    };
    const IconComponent = icons[iconName] || Box;
    return <IconComponent className="h-4 w-4" />;
  };

  const getColorClasses = (color: string) => {
    const colorMap: { [key: string]: string } = {
      blue: "text-blue-600",
      red: "text-red-600", 
      green: "text-green-600",
      purple: "text-purple-600",
      orange: "text-orange-600",
      indigo: "text-indigo-600"
    };
    return colorMap[color] || colorMap.blue;
  };

  const selectedBox = collectionBoxes.find(box => box.id === selectedBoxId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full justify-between" 
          disabled={disabled}
        >
          <div className="flex items-center gap-2">
            <Box className="h-4 w-4" />
            {selectedBox ? (
              <span className="truncate">{selectedBox.name}</span>
            ) : (
              <span>Select from collection box...</span>
            )}
          </div>
          <ChevronDown className="h-4 w-4 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        className="w-80 bg-background border shadow-lg" 
        align="start"
        sideOffset={4}
      >
        <DropdownMenuLabel className="flex items-center gap-2">
          <Box className="h-4 w-4" />
          Your Collection Boxes
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <ScrollArea className="h-[300px]">
          <div className="space-y-1 p-1">
            {collectionBoxes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Box className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No collection boxes yet</p>
                <p className="text-xs mt-1">Start organizing your cards by creating boxes</p>
              </div>
            ) : collectionBoxes.map((box) => (
              <DropdownMenuItem
                key={box.id}
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 rounded-md"
                onClick={() => onSelectBox(box.id)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={getColorClasses(box.color)}>
                    {getIconComponent(box.icon)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium truncate">{box.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {box.cardCount}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {box.description}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className="text-xs font-medium">
                    ${box.totalValue.toLocaleString()}
                  </p>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        </ScrollArea>
        
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="flex items-center gap-2 text-primary cursor-pointer p-3"
          onClick={() => window.location.href = '/collection'}
        >
          <Plus className="h-4 w-4" />
          Manage Collection Boxes
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default CollectionBoxSelector;