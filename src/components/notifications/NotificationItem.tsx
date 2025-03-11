
import React from "react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { ArrowLeftRight, AlertCircle, MessageSquare, Bell, CheckCircle2 } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { Notification } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";

interface NotificationItemProps {
  notification: Notification;
}

const NotificationItem = ({ notification }: NotificationItemProps) => {
  const { markAsRead } = useNotifications();
  
  const getIcon = () => {
    switch (notification.type) {
      case "trade":
        return <ArrowLeftRight className="h-4 w-4 text-blue-500" />;
      case "message":
        return <MessageSquare className="h-4 w-4 text-green-500" />;
      case "alert":
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      default:
        return <Bell className="h-4 w-4 text-primary" />;
    }
  };

  const handleClick = () => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
  };

  return (
    <Link
      to={notification.link || "#"}
      onClick={handleClick}
      className={cn(
        "flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors",
        !notification.read && "bg-muted/20"
      )}
    >
      <div className="flex-shrink-0 mt-1">
        {notification.sender?.avatar ? (
          <Avatar className="h-8 w-8">
            <AvatarImage src={notification.sender.avatar} alt={notification.sender.name} />
            <AvatarFallback>{notification.sender.name.substring(0, 2)}</AvatarFallback>
          </Avatar>
        ) : (
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
            {getIcon()}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm", !notification.read && "font-medium")}>
          {notification.message}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
        </p>
      </div>
      {!notification.read && (
        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2"></div>
      )}
    </Link>
  );
};

export default NotificationItem;
