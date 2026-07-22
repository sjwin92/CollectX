import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import GlassCard from "@/components/ui/custom/GlassCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUser } from "@/hooks/useUser";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import { Loader2, SendHorizontal, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  getConversations,
  getConversationMessages,
  sendMessage as sendChatMessage,
  markMessagesAsRead,
  subscribeToConversation,
  type ChatConversation,
} from "@/services/supabaseNotificationService";

interface ConversationWithProfile extends ChatConversation {
  otherUserId: string;
  otherName: string;
  otherAvatar: string | null;
}

const Messages = () => {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get("conversation"));
  const [draft, setDraft] = useState("");

  const conversationsQuery = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async (): Promise<ConversationWithProfile[]> => {
      const conversations = await getConversations();
      if (conversations.length === 0) return [];

      const otherIds = conversations.map((c) => (c.user1_id === user!.id ? c.user2_id : c.user1_id));
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", otherIds);
      const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));

      return conversations.map((c) => {
        const otherId = c.user1_id === user!.id ? c.user2_id : c.user1_id;
        const p = profileMap.get(otherId);
        return {
          ...c,
          otherUserId: otherId,
          otherName: p?.display_name || "A trader",
          otherAvatar: p?.avatar_url ?? null,
        };
      });
    },
    enabled: !!user,
  });

  const messagesQuery = useQuery({
    queryKey: ["conversation-messages", selectedId],
    queryFn: () => getConversationMessages(selectedId!),
    enabled: !!selectedId,
  });

  useEffect(() => {
    if (!selectedId) return;

    markMessagesAsRead(selectedId).then(() => {
      queryClient.invalidateQueries({ queryKey: ["unread-message-count"] });
    });

    const unsubscribe = subscribeToConversation(selectedId, () => {
      queryClient.invalidateQueries({ queryKey: ["conversation-messages", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] });
    });

    return unsubscribe;
  }, [selectedId, queryClient, user?.id]);

  const sendMutation = useMutation({
    mutationFn: (text: string) => sendChatMessage(selectedId!, text),
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["conversation-messages", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] });
    },
    onError: () => toast({ variant: "destructive", title: "Couldn't send message" }),
  });

  const handleSend = () => {
    if (!draft.trim() || !selectedId) return;
    sendMutation.mutate(draft.trim());
  };

  const conversations = conversationsQuery.data ?? [];
  const selected = conversations.find((c) => c.id === selectedId);

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 pt-24 pb-16">
        <div className="container">
          <div className="flex items-center gap-2 mb-6">
            <MessageSquare className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Messages</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <GlassCard className="p-2 md:col-span-1 h-[70vh] overflow-y-auto">
              {conversationsQuery.isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin" />
                  Loading...
                </div>
              ) : conversations.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm px-4">
                  No conversations yet. Message a seller from a marketplace listing to get started.
                </p>
              ) : (
                <div className="space-y-1">
                  {conversations.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedId(c.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-md text-left transition-colors ${
                        selectedId === c.id ? "bg-primary/10" : "hover:bg-muted"
                      }`}
                    >
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarImage src={c.otherAvatar || undefined} alt={c.otherName} />
                        <AvatarFallback>{c.otherName.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{c.otherName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(c.last_message_at), { addSuffix: true })}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </GlassCard>

            <GlassCard className="p-4 md:col-span-2 flex flex-col h-[70vh]">
              {!selected ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                  Select a conversation to view messages
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 pb-3 border-b border-border mb-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={selected.otherAvatar || undefined} alt={selected.otherName} />
                      <AvatarFallback className="text-xs">
                        {selected.otherName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{selected.otherName}</span>
                  </div>

                  <ScrollArea className="flex-1 mb-3">
                    <div className="space-y-2 pr-2">
                      {messagesQuery.isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Loader2 className="h-6 w-6 mx-auto animate-spin" />
                        </div>
                      ) : (
                        (messagesQuery.data ?? []).map((m) => {
                          const isMine = m.sender_user_id === user.id;
                          return (
                            <div
                              key={m.id}
                              className={`p-3 rounded-md max-w-[75%] w-fit ${
                                isMine ? "bg-primary/10 ml-auto text-right" : "bg-secondary/10 mr-auto text-left"
                              }`}
                            >
                              <div>{m.message}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {format(new Date(m.created_at), "Pp")}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>

                  <div className="flex items-end gap-2">
                    <Textarea
                      placeholder="Type your message..."
                      className="flex-1 resize-none"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                    />
                    <Button onClick={handleSend} disabled={!draft.trim() || sendMutation.isPending}>
                      {sendMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <SendHorizontal className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </>
              )}
            </GlassCard>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Messages;
