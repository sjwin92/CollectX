
import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Users, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useChat } from "@/hooks/useChat";
import ConversationList from "./ConversationList";
import MessageList from "./MessageList";

const ChatBox = () => {
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState("");
  const [viewMode, setViewMode] = useState<"conversations" | "messages">("conversations");
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const { user } = useAuth();
  const { 
    conversations, 
    messages, 
    activeConversationName,
    sendMessage, 
    loadConversation
  } = useChat();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversation) return;
    
    sendMessage(activeConversation, newMessage.trim());
    setNewMessage("");
  };

  const handleSelectConversation = (conversationId: string) => {
    loadConversation(conversationId);
    setActiveConversation(conversationId);
    setViewMode("messages");
  };

  const handleBackToConversations = () => {
    setViewMode("conversations");
    setActiveConversation(null);
  };

  if (!user) {
    return (
      <Card className="overflow-hidden border-0 shadow-md">
        <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
          <MessageSquare className="h-12 w-12 mb-3 opacity-20" />
          <p className="text-muted-foreground">Please sign in to use chat</p>
          <Button className="mt-4" size="sm" asChild>
            <Link to="/auth">Sign In</Link>
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-0 shadow-md flex flex-col h-[400px]">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        {viewMode === "messages" && activeConversation ? (
          <>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleBackToConversations}
              className="mr-2 px-2"
            >
              ←
            </Button>
            <h3 className="font-medium flex-1 truncate">{activeConversationName}</h3>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <h3 className="font-medium">Messages</h3>
            </div>
            <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
              <Link to="/trades">View all</Link>
            </Button>
          </>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        {viewMode === "conversations" ? (
          <ConversationList 
            conversations={conversations} 
            onSelectConversation={handleSelectConversation} 
          />
        ) : (
          <MessageList 
            messages={messages} 
            currentUserId={user.id} 
          />
        )}
      </div>

      {viewMode === "messages" && activeConversation && (
        <form onSubmit={handleSendMessage} className="border-t p-3 flex gap-2">
          <Input 
            value={newMessage} 
            onChange={(e) => setNewMessage(e.target.value)} 
            placeholder="Type a message..." 
            className="flex-1"
          />
          <Button 
            type="submit" 
            size="sm" 
            disabled={!newMessage.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      )}
    </Card>
  );
};

export default ChatBox;
