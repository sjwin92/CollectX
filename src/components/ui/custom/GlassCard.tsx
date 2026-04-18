
import React from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
  hover?: boolean;
  animation?: "fade" | "scale" | "slide" | "none";
  variant?: "default" | "dark" | "frosted";
}

const GlassCard = ({
  className,
  children,
  hover = true,
  animation = "none",
  variant = "default",
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

  const getVariantClass = () => {
    switch (variant) {
      case "dark":
        return "bg-black/60 backdrop-blur-xl border border-white/10 text-white";
      case "frosted":
        return "bg-white/10 backdrop-blur-xl border border-white/20 text-white shadow-[0_4px_30px_rgba(0,0,0,0.1)]";
      default:
        return "glass";
    }
  };

  return (
    <div
      className={cn(
        "rounded-xl p-4",
        getVariantClass(),
        hover && "transition-all duration-300 hover:shadow-lg",
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
