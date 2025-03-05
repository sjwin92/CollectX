
import React from "react";
import { cn } from "@/lib/utils";

export type ReputationLevel = "new" | "established" | "trusted";

interface BadgeProps {
  className?: string;
  variant?: "default" | "outline" | "success" | "warning" | "danger" | "info" | "reputation";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
  reputation?: ReputationLevel;
}

const Badge = ({
  className,
  variant = "default",
  size = "md",
  children,
  reputation,
  ...props
}: BadgeProps) => {
  
  const baseClasses = "inline-flex items-center justify-center rounded-full font-medium transition-colors";
  
  const sizeClasses = {
    sm: "text-xs px-2 h-5",
    md: "text-xs px-2.5 h-6",
    lg: "text-sm px-3 h-7",
  };
  
  const variantClasses = {
    default: "bg-primary/10 text-primary hover:bg-primary/20",
    outline: "border border-border text-foreground hover:bg-secondary/50",
    success: "bg-green-100 text-green-800 hover:bg-green-200",
    warning: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
    danger: "bg-red-100 text-red-800 hover:bg-red-200",
    info: "bg-blue-100 text-blue-800 hover:bg-blue-200",
    reputation: "",
  };
  
  // Special handling for reputation badges
  let reputationClass = "";
  if (variant === "reputation" && reputation) {
    switch (reputation) {
      case "new":
        reputationClass = "bg-blue-100 text-blue-800 hover:bg-blue-200";
        break;
      case "established":
        reputationClass = "bg-green-100 text-green-800 hover:bg-green-200";
        break;
      case "trusted":
        reputationClass = "bg-purple-100 text-purple-800 hover:bg-purple-200";
        break;
    }
  }

  return (
    <span
      className={cn(
        baseClasses,
        sizeClasses[size],
        variant === "reputation" ? reputationClass : variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

export default Badge;
