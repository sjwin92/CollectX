
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bell, Check, TrashIcon } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import NotificationItem from "./NotificationItem";
import { ScrollArea } from "@/components/ui/scroll-area";

const NotificationBox = () => {
  const { notifications, markAllAsRead, clearAllNotifications } = useNotifications();
  const unreadNotifications = notifications.filter(n => !n.read);
  const hasUnread = unreadNotifications.length > 0;

  return (
    <Card className="overflow-hidden border-0 shadow-md">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          <h3 className="font-medium">Notifications</h3>
          {hasUnread && (
            <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full">
              {unreadNotifications.length}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={markAllAsRead} 
            disabled={!hasUnread}
            className="h-7 text-xs"
          >
            <Check className="h-3.5 w-3.5 mr-1" />
            Mark all read
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearAllNotifications}
            disabled={notifications.length === 0}
            className="h-7 text-xs"
          >
            <TrashIcon className="h-3.5 w-3.5 mr-1" />
            Clear all
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid grid-cols-2 px-4 py-2">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread" disabled={!hasUnread}>
            Unread {hasUnread && `(${unreadNotifications.length})`}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="m-0">
          <ScrollArea className="h-[300px] p-0">
            {notifications.length > 0 ? (
              <div className="divide-y">
                {notifications.map((notification) => (
                  <NotificationItem 
                    key={notification.id} 
                    notification={notification} 
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-8 text-center text-muted-foreground">
                <Bell className="h-12 w-12 mb-3 opacity-20" />
                <p>No notifications yet</p>
                <p className="text-sm mt-1">New activity will appear here</p>
              </div>
            )}
          </ScrollArea>
        </TabsContent>
        
        <TabsContent value="unread" className="m-0">
          <ScrollArea className="h-[300px] p-0">
            {unreadNotifications.length > 0 ? (
              <div className="divide-y">
                {unreadNotifications.map((notification) => (
                  <NotificationItem 
                    key={notification.id} 
                    notification={notification} 
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-8 text-center text-muted-foreground">
                <Check className="h-12 w-12 mb-3 opacity-20" />
                <p>All caught up!</p>
                <p className="text-sm mt-1">You've read all your notifications</p>
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
      
      <div className="border-t px-4 py-2.5 text-center">
        <Button variant="link" size="sm" asChild className="h-auto p-0">
          <Link to="/trades">View all trades</Link>
        </Button>
      </div>
    </Card>
  );
};

export default NotificationBox;
