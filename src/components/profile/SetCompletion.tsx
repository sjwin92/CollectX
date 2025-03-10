
import React from "react";
import GlassCard from "@/components/ui/custom/GlassCard";

interface SetCompletionProps {
  sets: {
    name: string;
    completion: number;
  }[];
}

const SetCompletion = ({ sets }: SetCompletionProps) => {
  return (
    <GlassCard className="p-6">
      <h3 className="text-lg font-medium mb-4">Set Completion</h3>
      <div className="space-y-3">
        {sets.map((set, index) => (
          <div key={index}>
            <div className="flex justify-between text-sm mb-1">
              <span>{set.name}</span>
              <span className="font-medium">{set.completion}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full" 
                style={{ width: `${set.completion}%` }} 
              />
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
};

export default SetCompletion;
