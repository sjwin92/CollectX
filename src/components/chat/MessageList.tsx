
import React, { useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Message } from "@/hooks/useChat";

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
}

const MessageList = ({ messages, currentUserId }: MessageListProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-8 text-center text-muted-foreground">
        <p>No messages yet</p>
        <p className="text-sm mt-1">Start the conversation</p>
      </div>
    );
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <ScrollArea className="h-full p-3">
      <div className="flex flex-col gap-3">
        {messages.map((message, index) => {
          const isCurrentUser = message.senderId === currentUserId;
          
          return (
            <div 
              key={message.id} 
              className={cn(
                "flex gap-2",
                isCurrentUser ? "justify-end" : "justify-start"
              )}
            >
              {!isCurrentUser && (
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src={message.senderAvatar || ""} alt={message.senderName} />
                  <AvatarFallback>{message.senderName.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
              )}
              
              <div className={cn(
                "max-w-[70%] flex flex-col",
                isCurrentUser && "items-end"
              )}>
                {!isCurrentUser && (
                  <span className="text-xs text-muted-foreground mb-1">{message.senderName}</span>
                )}
                
                <div className={cn(
                  "px-3 py-2 rounded-2xl text-sm",
                  isCurrentUser 
                    ? "bg-primary text-primary-foreground rounded-tr-none" 
                    : "bg-muted rounded-tl-none"
                )}>
                  {message.content}
                </div>
                
                <span className="text-xs text-muted-foreground mt-1">
                  {formatTime(message.timestamp)}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>
    </ScrollArea>
  );
};

export default MessageList;
