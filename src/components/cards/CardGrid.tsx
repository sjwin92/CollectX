
import React from "react";
import CardItem, { CardItemProps } from "@/components/cards/CardItem";
import { cn } from "@/lib/utils";

interface CardGridProps {
  cards: Omit<CardItemProps, "animation">[];
  className?: string;
  columns?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  animated?: boolean;
  staggered?: boolean;
}

const CardGrid = ({
  cards,
  className,
  columns = { sm: 2, md: 3, lg: 4, xl: 5 },
  animated = false,
  staggered = false,
}: CardGridProps) => {
  const getGridClasses = () => {
    return cn(
      "grid gap-6",
      columns.sm === 1 && "grid-cols-1",
      columns.sm === 2 && "grid-cols-2",
      columns.sm === 3 && "grid-cols-3",
      columns.md === 2 && "md:grid-cols-2",
      columns.md === 3 && "md:grid-cols-3",
      columns.md === 4 && "md:grid-cols-4",
      columns.lg === 3 && "lg:grid-cols-3",
      columns.lg === 4 && "lg:grid-cols-4",
      columns.lg === 5 && "lg:grid-cols-5",
      columns.xl === 4 && "xl:grid-cols-4",
      columns.xl === 5 && "xl:grid-cols-5",
      columns.xl === 6 && "xl:grid-cols-6"
    );
  };

  return (
    <div className={cn(getGridClasses(), className)}>
      {cards.map((card, index) => (
        <CardItem
          key={card.id}
          {...card}
          animation={animated ? "fade" : "none"}
          className={cn(
            animated && staggered ? 
              `transition-all duration-500 delay-${((index % 10) * 150)}` : 
              "transition-all duration-300",
            index % 2 === 0 ? "animate-float" : "",
            className
          )}
        />
      ))}
    </div>
  );
};

export default CardGrid;
