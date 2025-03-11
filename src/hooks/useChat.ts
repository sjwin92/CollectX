
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  timestamp: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  name: string;
  avatar?: string;
  lastMessage: string;
  lastMessageTime: string;
  hasUnread: boolean;
  tradeId: string;
}

export function useChat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeConversationName, setActiveConversationName] = useState<string>("");
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch conversations when user logs in
  useEffect(() => {
    if (!user) {
      setConversations([]);
      setMessages([]);
      return;
    }

    // For demo purposes, we're adding sample conversations
    // This would be replaced with a real API call in a production app
    const mockConversations: Conversation[] = [
      {
        id: "c1",
        name: "Alex Morgan",
        lastMessage: "I'm interested in trading my Charizard card",
        lastMessageTime: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
        hasUnread: true,
        tradeId: "t1"
      },
      {
        id: "c2",
        name: "Jordan Lee",
        lastMessage: "Would you consider adding another card to the trade?",
        lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
        hasUnread: false,
        tradeId: "t2"
      },
      {
        id: "c3",
        name: "Chris Patel",
        lastMessage: "Thanks for the trade!",
        lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
        hasUnread: true,
        tradeId: "t3"
      }
    ];

    setConversations(mockConversations);
    
    // In a real application, we would fetch conversations from Supabase
    // const fetchConversations = async () => {
    //   const { data, error } = await supabase
    //     .from('trade_messages')
    //     .select(`
    //       trade_id,
    //       trade_proposals!inner(recipient_id, initiator_id, id)
    //     `)
    //     .or(`trade_proposals.recipient_id.eq.${user.id},trade_proposals.initiator_id.eq.${user.id}`)
    //     .order('created_at', { ascending: false });
    //
    //   if (error) {
    //     console.error('Error fetching conversations:', error);
    //     return;
    //   }
    //
    //   // Process data to create conversation list
    //   // ...
    // };
    //
    // fetchConversations();
  }, [user]);

  const loadConversation = (conversationId: string) => {
    if (!user || !conversationId) return;
    
    setActiveConversationId(conversationId);
    
    // Find conversation details
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      setActiveConversationName(conversation.name);
    }

    // For demo purposes, we're adding sample messages
    // This would be replaced with a real API call in a production app
    const mockMessages: Message[] = [
      {
        id: "m1",
        content: "Hi there! I'm interested in trading for your Charizard card.",
        senderId: "u1",
        senderName: "Alex Morgan",
        timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
        read: true
      },
      {
        id: "m2",
        content: "Hello! What would you like to offer?",
        senderId: user.id,
        senderName: "Me",
        timestamp: new Date(Date.now() - 1000 * 60 * 55).toISOString(), // 55 minutes ago
        read: true
      },
      {
        id: "m3",
        content: "I have a mint condition Blastoise and a Venusaur I could trade.",
        senderId: "u1",
        senderName: "Alex Morgan",
        timestamp: new Date(Date.now() - 1000 * 60 * 50).toISOString(), // 50 minutes ago
        read: true
      },
      {
        id: "m4",
        content: "That sounds interesting! Could I see some pictures?",
        senderId: user.id,
        senderName: "Me",
        timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 minutes ago
        read: true
      },
      {
        id: "m5",
        content: "Sure, I'll send them over shortly. Are you interested in a 2-for-1 trade?",
        senderId: "u1",
        senderName: "Alex Morgan",
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
        read: false
      }
    ];

    setMessages(mockMessages);
    
    // In a real application, we would fetch messages from Supabase
    // const fetchMessages = async () => {
    //   const { data, error } = await supabase
    //     .from('trade_messages')
    //     .select(`
    //       *,
    //       profiles:user_id(id, username, avatar_url)
    //     `)
    //     .eq('trade_id', conversation.tradeId)
    //     .order('created_at', { ascending: true });
    //
    //   if (error) {
    //     console.error('Error fetching messages:', error);
    //     return;
    //   }
    //
    //   // Process data to create message list
    //   // ...
    // };
    //
    // fetchMessages();
    
    // Mark conversation as read
    setConversations(prev => 
      prev.map(c => c.id === conversationId ? { ...c, hasUnread: false } : c)
    );
  };

  const sendMessage = (conversationId: string, content: string) => {
    if (!user || !content.trim() || !conversationId) return;
    
    const newMessage: Message = {
      id: `m${Date.now()}`,
      content,
      senderId: user.id,
      senderName: "Me",
      timestamp: new Date().toISOString(),
      read: true
    };
    
    // Add message to local state
    setMessages(prev => [...prev, newMessage]);
    
    // Update conversation last message
    setConversations(prev => 
      prev.map(c => c.id === conversationId ? { 
        ...c, 
        lastMessage: content, 
        lastMessageTime: new Date().toISOString()
      } : c)
    );
    
    // In a real application, we would send message to Supabase
    // const conversation = conversations.find(c => c.id === conversationId);
    // if (!conversation) return;
    //
    // supabase
    //   .from('trade_messages')
    //   .insert({
    //     trade_id: conversation.tradeId,
    //     user_id: user.id,
    //     message: content
    //   })
    //   .then(({ error }) => {
    //     if (error) {
    //       console.error('Error sending message:', error);
    //       toast({
    //         title: "Error",
    //         description: "Failed to send message",
    //         variant: "destructive"
    //       });
    //     }
    //   });
  };

  return {
    conversations,
    messages,
    activeConversationId,
    activeConversationName,
    loadConversation,
    sendMessage
  };
}
