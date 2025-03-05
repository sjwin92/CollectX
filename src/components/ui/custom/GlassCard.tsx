
import React from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
  hover?: boolean;
  animation?: "fade" | "scale" | "slide" | "none";
}

const GlassCard = ({
  className,
  children,
  hover = true,
  animation = "none",
  ...props
}: GlassCardProps) => {
  const getAnimationClass = () => {
    switch (animation) {
      case "fade":
        return "animate-fade-in";
      case "scale":
        return "animate-scale-in";
      case "slide":
        return "animate-slide-up";
      default:
        return "";
    }
  };

  return (
    <div
      className={cn(
        "glass rounded-lg p-4",
        hover && "transition-all duration-300 hover:shadow-md hover:translate-y-[-2px]",
        getAnimationClass(),
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default GlassCard;
