
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  MessageSquare, 
  Users, 
  ArrowLeftRight, 
  Search, 
  Send,
  Star,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import ReputationBadge from './ReputationBadge';

interface SocialTradeHubProps {
  isOpen: boolean;
  onClose: () => void;
}

const SocialTradeHub = ({ isOpen, onClose }: SocialTradeHubProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');

  // Mock data for active chats and trades
  const activeChats = [
    {
      id: '1',
      user: { name: 'Alex Morgan', avatar: '/placeholder.svg', reputation: 'trusted' as const },
      lastMessage: 'Hey, are you still interested in trading that Charizard?',
      timestamp: '2 min ago',
      unread: 2,
      tradeId: 't1'
    },
    {
      id: '2', 
      user: { name: 'Jordan Lee', avatar: '/placeholder.svg', reputation: 'established' as const },
      lastMessage: 'Package shipped! Tracking: 1234567890',
      timestamp: '1 hour ago',
      unread: 0,
      tradeId: 't2'
    },
    {
      id: '3',
      user: { name: 'Taylor Kim', avatar: '/placeholder.svg', reputation: 'new' as const },
      lastMessage: 'Thanks for the smooth trade!',
      timestamp: '1 day ago', 
      unread: 0,
      tradeId: 't3'
    }
  ];

  const onlineUsers = [
    { id: '1', name: 'Sarah Chen', avatar: '/placeholder.svg', reputation: 'trusted' as const, status: 'Looking for vintage cards' },
    { id: '2', name: 'Mike Johnson', avatar: '/placeholder.svg', reputation: 'established' as const, status: 'Trading modern sets' },
    { id: '3', name: 'Emma Davis', avatar: '/placeholder.svg', reputation: 'trusted' as const, status: 'Graded cards only' }
  ];

  const recentTrades = [
    { id: 't1', status: 'pending' as const, user: 'Alex Morgan', cards: 3, value: '$150' },
    { id: 't2', status: 'shipped' as const, user: 'Jordan Lee', cards: 2, value: '$89' },
    { id: 't3', status: 'completed' as const, user: 'Taylor Kim', cards: 1, value: '$45' }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'shipped': return <ArrowLeftRight className="h-4 w-4 text-blue-500" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const sendMessage = () => {
    if (messageInput.trim() && selectedChat) {
      // TODO: Implement actual message sending
      console.log(`Sending message to ${selectedChat}: ${messageInput}`);
      setMessageInput('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Social & Trade Hub
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="chats" className="flex-1 flex flex-col">
          <TabsList className="mx-6 grid w-full grid-cols-3">
            <TabsTrigger value="chats" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Chats
            </TabsTrigger>
            <TabsTrigger value="community" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Community
            </TabsTrigger>
            <TabsTrigger value="trades" className="flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4" />
              Quick Trades
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chats" className="flex-1 flex m-0">
            <div className="w-1/3 border-r p-4">
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {activeChats.map((chat) => (
                      <div
                        key={chat.id}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedChat === chat.id ? 'bg-primary/10' : 'hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedChat(chat.id)}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={chat.user.avatar} />
                            <AvatarFallback>{chat.user.name.slice(0, 2)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm truncate">{chat.user.name}</span>
                              <ReputationBadge reputation={chat.user.reputation} size="sm" />
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{chat.lastMessage}</p>
                            <span className="text-xs text-muted-foreground">{chat.timestamp}</span>
                          </div>
                          {chat.unread > 0 && (
                            <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                              {chat.unread}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>

            <div className="flex-1 flex flex-col">
              {selectedChat ? (
                <>
                  <div className="p-4 border-b">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src="/placeholder.svg" />
                        <AvatarFallback>AM</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Alex Morgan</span>
                          <ReputationBadge reputation="trusted" size="sm" />
                        </div>
                        <span className="text-sm text-muted-foreground">Trade ID: #t1</span>
                      </div>
                    </div>
                  </div>

                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      <div className="flex gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src="/placeholder.svg" />
                          <AvatarFallback>AM</AvatarFallback>
                        </Avatar>
                        <div className="bg-muted p-3 rounded-lg max-w-xs">
                          <p className="text-sm">Hey, are you still interested in trading that Charizard?</p>
                          <span className="text-xs text-muted-foreground">2 min ago</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-3 justify-end">
                        <div className="bg-primary text-primary-foreground p-3 rounded-lg max-w-xs">
                          <p className="text-sm">Yes! Let me check the condition and get back to you.</p>
                          <span className="text-xs opacity-70">1 min ago</span>
                        </div>
                      </div>
                    </div>
                  </ScrollArea>

                  <div className="p-4 border-t">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Type a message..."
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        className="flex-1"
                      />
                      <Button onClick={sendMessage} size="icon">
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a conversation to start chatting</p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="community" className="flex-1 p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Online Traders</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {onlineUsers.map((user) => (
                    <div key={user.id} className="p-4 border rounded-lg">
                      <div className="flex items-center gap-3 mb-2">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback>{user.name.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{user.name}</span>
                            <ReputationBadge reputation={user.reputation} size="sm" />
                          </div>
                          <p className="text-sm text-muted-foreground">{user.status}</p>
                        </div>
                        <Button size="sm" variant="outline">
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Chat
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="trades" className="flex-1 p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Recent Trade Activity</h3>
                <div className="space-y-3">
                  {recentTrades.map((trade) => (
                    <div key={trade.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(trade.status)}
                        <div>
                          <p className="font-medium">Trade with {trade.user}</p>
                          <p className="text-sm text-muted-foreground">
                            {trade.cards} cards • {trade.value} value
                          </p>
                        </div>
                      </div>
                      <Badge variant={
                        trade.status === 'completed' ? 'default' :
                        trade.status === 'shipped' ? 'secondary' : 'outline'
                      }>
                        {trade.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default SocialTradeHub;
