
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type NotificationType = "trade" | "message" | "alert" | "success";

export interface Notification {
  id: string;
  message: string;
  read: boolean;
  timestamp: string;
  type: NotificationType;
  link?: string;
  sender?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch notifications when user logs in
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    // For demo purposes, we're adding sample notifications 
    // This would be replaced with a real API call in a production app
    const mockNotifications: Notification[] = [
      {
        id: "1",
        message: "Alex Morgan proposed a new trade",
        read: false,
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
        type: "trade",
        link: "/trades/t1",
        sender: {
          id: "u1",
          name: "Alex Morgan"
        }
      },
      {
        id: "2",
        message: "You received a new message from Jordan Lee",
        read: true,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
        type: "message",
        link: "/trades/t2",
        sender: {
          id: "u2",
          name: "Jordan Lee"
        }
      },
      {
        id: "3",
        message: "Your trade with Chris Patel was completed",
        read: false,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
        type: "success",
        link: "/trades/t3"
      }
    ];

    setNotifications(mockNotifications);
    
    // In a real application, we would listen to Supabase for real-time notifications
    // const channel = supabase
    //   .channel('public:notifications')
    //   .on('postgres_changes', 
    //     { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
    //     (payload) => {
    //       setNotifications(prev => [payload.new as Notification, ...prev]);
    //     }
    //   )
    //   .subscribe();
    
    // return () => {
    //   supabase.removeChannel(channel);
    // };
  }, [user]);

  // Update unread state whenever notifications change
  useEffect(() => {
    const hasUnread = notifications.some(n => !n.read);
    setHasUnreadNotifications(hasUnread);
    
    const hasUnreadMsg = notifications.some(n => !n.read && n.type === 'message');
    setHasUnreadMessages(hasUnreadMsg);
  }, [notifications]);

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    
    // In a real app, you would update the database:
    // supabase
    //   .from('notifications')
    //   .update({ read: true })
    //   .eq('id', id)
    //   .eq('user_id', user?.id);
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    );
    
    // In a real app, you would update the database:
    // supabase
    //   .from('notifications')
    //   .update({ read: true })
    //   .eq('user_id', user?.id);
    
    toast({
      title: "Notifications marked as read",
      description: "All notifications have been marked as read"
    });
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    
    // In a real app, you would update the database:
    // supabase
    //   .from('notifications')
    //   .delete()
    //   .eq('user_id', user?.id);
    
    toast({
      title: "Notifications cleared",
      description: "All notifications have been cleared"
    });
  };

  return {
    notifications,
    hasUnreadNotifications,
    hasUnreadMessages,
    markAsRead,
    markAllAsRead,
    clearAllNotifications
  };
}
