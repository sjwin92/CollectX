
import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Conversation } from "@/hooks/useChat";
import { MessageSquare } from "lucide-react";

interface ConversationListProps {
  conversations: Conversation[];
  onSelectConversation: (id: string) => void;
}

const ConversationList = ({ conversations, onSelectConversation }: ConversationListProps) => {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-8 text-center text-muted-foreground">
        <MessageSquare className="h-12 w-12 mb-3 opacity-20" />
        <p>No conversations yet</p>
        <p className="text-sm mt-1">Start a trade to begin messaging</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="divide-y">
        {conversations.map((conversation) => (
          <div
            key={conversation.id}
            onClick={() => onSelectConversation(conversation.id)}
            className={cn(
              "flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors cursor-pointer",
              conversation.hasUnread && "bg-muted/20"
            )}
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={conversation.avatar || ""} alt={conversation.name} />
              <AvatarFallback>{conversation.name.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                <p className={cn("font-medium text-sm truncate", conversation.hasUnread && "font-semibold")}>
                  {conversation.name}
                </p>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(conversation.lastMessageTime), { addSuffix: false })}
                </span>
              </div>
              
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {conversation.lastMessage}
              </p>
            </div>
            
            {conversation.hasUnread && (
              <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2"></div>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};

export default ConversationList;
