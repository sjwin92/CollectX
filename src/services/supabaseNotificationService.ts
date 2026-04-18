import { supabase as supabaseTyped } from '@/integrations/supabase/client';
const supabase = supabaseTyped as any;

export interface Notification {
  id: string;
  user_id: string;
  type: 'trade_proposal' | 'trade_accepted' | 'trade_declined' | 'trade_completed' | 'trade_message' | 'listing_interest' | 'listing_favorite' | 'profile_update' | 'system';
  title: string;
  message: string;
  data: any;
  read: boolean;
  read_at?: string;
  action_url?: string;
  expires_at?: string;
  created_at: string;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  email_notifications: boolean;
  push_notifications: boolean;
  trade_proposals: boolean;
  trade_updates: boolean;
  listing_activities: boolean;
  marketing: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatConversation {
  id: string;
  participant_1_id: string;
  participant_2_id: string;
  last_message_at: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  message: string;
  message_type: 'text' | 'image' | 'trade_offer' | 'system';
  metadata: any;
  read: boolean;
  read_at?: string;
  created_at: string;
}

// Notification functions
export const createNotification = async (
  userId: string,
  type: Notification['type'],
  title: string,
  message: string,
  data?: any,
  actionUrl?: string,
  expiresAt?: string
): Promise<string> => {
  const { data: notificationId, error } = await supabase.rpc('create_notification', {
    p_user_id: userId,
    p_type: type,
    p_title: title,
    p_message: message,
    p_data: data || {},
    p_action_url: actionUrl,
    p_expires_at: expiresAt
  });

  if (error) throw error;
  return notificationId;
};

// Get user's notifications
export const getNotifications = async (unreadOnly: boolean = false): Promise<Notification[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (unreadOnly) {
    query = query.eq('read', false);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []) as Notification[];
};

// Mark notifications as read
export const markNotificationsAsRead = async (notificationIds: string[]): Promise<void> => {
  const { error } = await supabase.rpc('mark_notifications_read', {
    notification_ids: notificationIds
  });

  if (error) throw error;
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async (): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('notifications')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('read', false);

  if (error) throw error;
};

// Get notification preferences
export const getNotificationPreferences = async (): Promise<NotificationPreferences | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // Ignore "not found" error
  return data as NotificationPreferences;
};

// Create or update notification preferences
export const updateNotificationPreferences = async (
  preferences: Partial<Omit<NotificationPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<NotificationPreferences> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert([{
      user_id: user.id,
      ...preferences
    }])
    .select()
    .single();

  if (error) throw error;
  return data as NotificationPreferences;
};

// Chat functions
export const getOrCreateConversation = async (otherUserId: string): Promise<string> => {
  const { data: conversationId, error } = await supabase.rpc('get_or_create_conversation', {
    other_user_id: otherUserId
  });

  if (error) throw error;
  return conversationId;
};

// Get user's conversations
export const getConversations = async (): Promise<ChatConversation[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('chat_conversations')
    .select('*')
    .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`)
    .order('last_message_at', { ascending: false });

  if (error) throw error;
  return (data || []) as ChatConversation[];
};

// Get messages for a conversation
export const getConversationMessages = async (conversationId: string): Promise<ChatMessage[]> => {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []) as ChatMessage[];
};

// Send a message
export const sendMessage = async (
  conversationId: string,
  message: string,
  messageType: ChatMessage['message_type'] = 'text',
  metadata?: any
): Promise<ChatMessage> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('chat_messages')
    .insert([{
      conversation_id: conversationId,
      sender_id: user.id,
      message,
      message_type: messageType,
      metadata: metadata || {}
    }])
    .select()
    .single();

  if (error) throw error;

  // Update conversation last_message_at
  await supabase
    .from('chat_conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId);

  return data as ChatMessage;
};

// Mark messages as read
export const markMessagesAsRead = async (conversationId: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('chat_messages')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .neq('sender_id', user.id)
    .eq('read', false);

  if (error) throw error;
};

// Get unread message count
export const getUnreadMessageCount = async (): Promise<number> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  // First get user's conversations
  const { data: conversations } = await supabase
    .from('chat_conversations')
    .select('id')
    .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`);

  if (!conversations || conversations.length === 0) return 0;

  const conversationIds = conversations.map(c => c.id);

  const { count, error } = await supabase
    .from('chat_messages')
    .select('*', { count: 'exact', head: true })
    .neq('sender_id', user.id)
    .eq('read', false)
    .in('conversation_id', conversationIds);

  if (error) return 0;
  return count || 0;
};

// Get unread notification count
export const getUnreadNotificationCount = async (): Promise<number> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false);

  if (error) return 0;
  return count || 0;
};

// Real-time subscriptions
export const subscribeToNotifications = (
  userId: string,
  onNotification: (payload: any) => void
) => {
  const channel = supabase
    .channel(`notifications-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      },
      onNotification
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
};

export const subscribeToConversation = (
  conversationId: string,
  onMessage: (payload: any) => void
) => {
  const channel = supabase
    .channel(`conversation-${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `conversation_id=eq.${conversationId}`
      },
      onMessage
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
};

export const subscribeToConversations = (
  userId: string,
  onUpdate: (payload: any) => void
) => {
  const channel = supabase
    .channel(`conversations-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'chat_conversations',
        filter: `participant_1_id=eq.${userId}`
      },
      onUpdate
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'chat_conversations',
        filter: `participant_2_id=eq.${userId}`
      },
      onUpdate
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
};

// Helper functions for creating specific notification types
export const createTradeProposalNotification = async (
  recipientUserId: string,
  initiatorName: string,
  tradeId: string
) => {
  return createNotification(
    recipientUserId,
    'trade_proposal',
    'New Trade Proposal',
    `${initiatorName} has proposed a trade with you`,
    { trade_id: tradeId, initiator_name: initiatorName },
    `/trades/${tradeId}`
  );
};

export const createListingInterestNotification = async (
  listingOwnerId: string,
  interestedUserName: string,
  listingId: string
) => {
  return createNotification(
    listingOwnerId,
    'listing_interest',
    'Someone is interested in your listing',
    `${interestedUserName} expressed interest in your card listing`,
    { listing_id: listingId, interested_user_name: interestedUserName },
    `/marketplace/${listingId}`
  );
};