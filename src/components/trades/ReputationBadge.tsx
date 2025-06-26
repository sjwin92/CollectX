
import React from 'react';
import Badge from '@/components/ui/custom/Badge';
import { UserReputation } from '@/models/escrow';
import { getReputationBadgeVariant, getEscrowDiscount } from '@/services/reputationService';
import { Star, Shield, Award, Crown, Sparkles } from 'lucide-react';

interface ReputationBadgeProps {
  reputation: UserReputation;
  showDiscount?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const ReputationBadge = ({ reputation, showDiscount = false, size = 'md' }: ReputationBadgeProps) => {
  const variant = getReputationBadgeVariant(reputation);
  const discount = getEscrowDiscount(reputation);
  
  const getIcon = () => {
    switch (reputation) {
      case 'new': return <Star className="h-3 w-3" />;
      case 'starter': return <Shield className="h-3 w-3" />;
      case 'established': return <Award className="h-3 w-3" />;
      case 'trusted': return <Crown className="h-3 w-3" />;
      case 'elite': return <Sparkles className="h-3 w-3" />;
      default: return <Star className="h-3 w-3" />;
    }
  };

  const getDisplayText = () => {
    const baseText = reputation.charAt(0).toUpperCase() + reputation.slice(1);
    return showDiscount && discount > 0 ? `${baseText} (-${discount}%)` : baseText;
  };

  return (
    <Badge 
      variant={variant} 
      size={size}
      className="flex items-center gap-1"
    >
      {getIcon()}
      {getDisplayText()}
    </Badge>
  );
};

export default ReputationBadge;
