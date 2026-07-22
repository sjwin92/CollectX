
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/integrations/supabase/client';
import {
  getOrCreateConversation,
  getConversations,
  getConversationMessages,
  sendMessage as sendChatMessage,
  markMessagesAsRead,
  type ChatConversation,
} from '@/services/supabaseNotificationService';
import { MessageSquare, Search, Send, X, ArrowLeft } from 'lucide-react';

interface SocialTradeHubProps {
  isOpen: boolean;
  onClose: () => void;
  otherUserId?: string;
}

interface ConversationWithProfile extends ChatConversation {
  otherUserId: string;
  otherName: string;
  otherAvatar?: string;
}

const SocialTradeHub = ({ isOpen, onClose, otherUserId }: SocialTradeHubProps) => {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');

  // When opened targeting a specific user (e.g. "Message seller"), get-or-create
  // that conversation and select it.
  const { data: targetedConversationId } = useQuery({
    queryKey: ['chat-target-conversation', otherUserId],
    queryFn: () => getOrCreateConversation(otherUserId as string),
    enabled: isOpen && !!otherUserId && !!user,
  });

  useEffect(() => {
    if (targetedConversationId) setSelectedConversationId(targetedConversationId);
  }, [targetedConversationId]);

  const { data: conversations = [] } = useQuery({
    queryKey: ['chat-conversations', user?.id],
    queryFn: async (): Promise<ConversationWithProfile[]> => {
      const convos = await getConversations();
      const otherIds = Array.from(
        new Set(convos.map((c) => (c.user1_id === user!.id ? c.user2_id : c.user1_id)))
      );
      type ChatProfile = { user_id: string; display_name: string | null; username: string | null; avatar_url: string | null };
      let profileMap = new Map<string, ChatProfile>();
      if (otherIds.length) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, username, avatar_url')
          .in('user_id', otherIds);
        profileMap = new Map((profiles || []).map((p: ChatProfile) => [p.user_id, p]));
      }
      return convos.map((c) => {
        const otherId = c.user1_id === user!.id ? c.user2_id : c.user1_id;
        const profile = profileMap.get(otherId);
        return {
          ...c,
          otherUserId: otherId,
          otherName: profile?.display_name || profile?.username || 'Collector',
          otherAvatar: profile?.avatar_url || undefined,
        };
      });
    },
    enabled: isOpen && !!user,
  });

  const { data: messages = [], refetch: refetchMessages } = useQuery({
    queryKey: ['chat-messages', selectedConversationId],
    queryFn: () => getConversationMessages(selectedConversationId as string),
    enabled: !!selectedConversationId,
  });

  // Realtime: refetch messages on any change to the open conversation's thread.
  useEffect(() => {
    if (!selectedConversationId) return;
    const channel = supabase
      .channel(`chat-messages-${selectedConversationId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${selectedConversationId}` },
        () => refetchMessages()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversationId, refetchMessages]);

  // Realtime: refresh the conversation list (previews, new conversations) for this user.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`chat-conversations-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_conversations', filter: `user1_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ['chat-conversations', user.id] })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_conversations', filter: `user2_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ['chat-conversations', user.id] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  // Mark the open conversation's messages read whenever it's selected/changes.
  useEffect(() => {
    if (!selectedConversationId) return;
    markMessagesAsRead(selectedConversationId).catch(() => {});
  }, [selectedConversationId, messages.length]);

  const sendMutation = useMutation({
    mutationFn: (text: string) => sendChatMessage(selectedConversationId as string, text),
    onSuccess: () => {
      setMessageInput('');
      refetchMessages();
      queryClient.invalidateQueries({ queryKey: ['chat-conversations', user?.id] });
    },
    onError: () =>
      toast({
        variant: 'destructive',
        title: "Couldn't send message",
        description: 'Please try again.',
      }),
  });

  const handleSend = () => {
    if (!messageInput.trim() || !selectedConversationId) return;
    sendMutation.mutate(messageInput.trim());
  };

  const filteredConversations = useMemo(() => {
    if (!searchQuery) return conversations;
    return conversations.filter((c) => c.otherName.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [conversations, searchQuery]);

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId);

  const conversationList = (
    <>
      <div className="p-4 border-b bg-background/50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Messages</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground px-4">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <h3 className="text-lg font-medium mb-2">No conversations yet</h3>
              <p className="text-sm">Message a trade partner to start a conversation</p>
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`p-3 rounded-lg cursor-pointer transition-all duration-200 mb-1 ${
                  selectedConversationId === conversation.id
                    ? 'bg-primary/10 border border-primary/20'
                    : 'hover:bg-background/50'
                }`}
                onClick={() => setSelectedConversationId(conversation.id)}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={conversation.otherAvatar} />
                    <AvatarFallback>{conversation.otherName.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-sm truncate">{conversation.otherName}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </>
  );

  const chatView = selectedConversation ? (
    <>
      <div className="p-3 md:p-4 border-b bg-background flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-8 w-8"
          onClick={() => setSelectedConversationId(null)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Avatar className="h-8 w-8 md:h-10 md:w-10">
          <AvatarImage src={selectedConversation.otherAvatar} />
          <AvatarFallback>{selectedConversation.otherName.slice(0, 2)}</AvatarFallback>
        </Avatar>
        <span className="font-semibold text-sm md:text-base">{selectedConversation.otherName}</span>
      </div>

      <ScrollArea className="flex-1 p-3 md:p-4">
        <div className="space-y-3 md:space-y-4">
          {messages.map((message) => {
            const isMine = message.sender_user_id === user?.id;
            return (
              <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] md:max-w-xs lg:max-w-md px-3 md:px-4 py-2 rounded-2xl ${
                    isMine ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}
                >
                  <p className="text-sm">{message.message}</p>
                  <span className={`text-xs ${isMine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="p-3 md:p-4 border-t bg-background">
        <div className="flex gap-2 items-end">
          <div className="flex-1 bg-muted rounded-full px-3 md:px-4 py-2 flex items-center gap-2">
            <Input
              placeholder="Type a message..."
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
            />
          </div>
          <Button
            onClick={handleSend}
            size="icon"
            className="rounded-full h-8 w-8 md:h-10 md:w-10"
            disabled={!messageInput.trim() || sendMutation.isPending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  ) : (
    <div className="flex-1 flex items-center justify-center text-muted-foreground p-4">
      <div className="text-center">
        <MessageSquare className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-4 opacity-30" />
        <h3 className="text-base md:text-lg font-medium mb-2">
          {conversations.length === 0 ? 'No conversations yet' : 'No conversation selected'}
        </h3>
        <p className="text-xs md:text-sm">
          {conversations.length === 0
            ? 'Message a trade partner to start a conversation'
            : 'Choose a conversation to start messaging'}
        </p>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-full h-[95vh] p-0 m-2 bg-background border-0 md:max-w-5xl md:h-[85vh] md:m-0">
        <div className="flex flex-col md:flex-row h-full rounded-lg overflow-hidden">
          {/* Mobile: show either the conversation list or the open chat, not both */}
          <div className={`md:hidden flex-1 flex flex-col bg-background ${selectedConversation ? '' : ''}`}>
            {selectedConversation ? chatView : <div className="flex flex-col h-full">{conversationList}</div>}
          </div>

          {/* Desktop: sidebar + chat side by side */}
          <div className="hidden md:flex w-80 bg-muted/30 border-r flex-col">{conversationList}</div>
          <div className="hidden md:flex flex-1 flex-col bg-background">{chatView}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SocialTradeHub;
