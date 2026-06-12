
import React, { useState, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { 
  MessageSquare, 
  Search, 
  Send,
  ArrowLeftRight,
  Package,
  Clock,
  CheckCircle,
  X,
  MoreHorizontal,
  Image as ImageIcon,
  Paperclip,
  Plus
} from 'lucide-react';
import { SmartImage } from '@/components/common/SmartImage';

interface SocialTradeHubProps {
  isOpen: boolean;
  onClose: () => void;
  newTradeProposal?: {
    user: { name: string; avatar?: string };
    message?: string;
    targetCard?: any;
    offeredCards?: any[];
  };
}

interface Message {
  id: string;
  sender: 'me' | 'them';
  text: string;
  time: string;
  type: 'text' | 'image';
  imageUrl?: string;
}

interface Conversation {
  id: string;
  user: { name: string; avatar: string };
  lastMessage: string;
  timestamp: string;
  unread: number;
  tradeStatus: string;
  messages: Message[];
}

const SocialTradeHub = ({ isOpen, onClose }: SocialTradeHubProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [showTradeProposal, setShowTradeProposal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Load conversations from localStorage on mount
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const savedConversations = localStorage.getItem('tradeConversations');
    if (savedConversations) {
      try {
        return JSON.parse(savedConversations);
      } catch (error) {
        console.error('Error loading conversations:', error);
      }
    }
    
    // Return empty conversations for fresh spawn
    return [];
  });

  // Save conversations to localStorage whenever they change
  React.useEffect(() => {
    localStorage.setItem('tradeConversations', JSON.stringify(conversations));
  }, [conversations]);

  const getTradeStatusColor = (status: string) => {
    switch (status) {
      case 'negotiating': return 'bg-blue-500';
      case 'shipped': return 'bg-yellow-500';
      case 'completed': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getTradeStatusIcon = (status: string) => {
    switch (status) {
      case 'negotiating': return <ArrowLeftRight className="h-3 w-3" />;
      case 'shipped': return <Package className="h-3 w-3" />;
      case 'completed': return <CheckCircle className="h-3 w-3" />;
      default: return <MessageSquare className="h-3 w-3" />;
    }
  };

  const sendMessage = () => {
    if (messageInput.trim() && selectedChat) {
      const newMessage = {
        id: Date.now().toString(),
        sender: 'me' as const,
        text: messageInput.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'text' as const
      };

      setConversations(prev => prev.map(conv => {
        if (conv.id === selectedChat) {
          return {
            ...conv,
            messages: [...conv.messages, newMessage],
            lastMessage: messageInput.trim(),
            timestamp: 'now'
          };
        }
        return conv;
      }));

      setMessageInput('');
      
      toast({
        title: "Message sent",
        description: "Your message has been delivered",
      });
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && selectedChat) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageMessage = {
          id: Date.now().toString(),
          sender: 'me' as const,
          text: '',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'image' as const,
          imageUrl: e.target?.result as string
        };

        setConversations(prev => prev.map(conv => {
          if (conv.id === selectedChat) {
            return {
              ...conv,
              messages: [...conv.messages, imageMessage],
              lastMessage: '📷 Image',
              timestamp: 'now'
            };
          }
          return conv;
        }));

        toast({
          title: "Image sent",
          description: "Your image has been shared",
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const openTradeProposal = () => {
    setShowTradeProposal(true);
    toast({
      title: "Opening trade proposal",
      description: "Create a formal trade offer",
    });
  };

  const selectedConversation = conversations.find(c => c.id === selectedChat);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-full h-[95vh] p-0 m-2 bg-background border-0 md:max-w-5xl md:h-[85vh] md:m-0">
        <div className="flex flex-col md:flex-row h-full rounded-lg overflow-hidden">
          {/* Mobile: Horizontal scrollable conversation tabs */}
          <div className="md:hidden border-b bg-background">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">Messages</h2>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <ScrollArea className="w-full">
              <div className="flex gap-2 p-4 min-w-max overflow-x-auto scrollbar-hide">
                {conversations.length === 0 ? (
                  <div className="w-full text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No conversations yet</p>
                    <p className="text-xs mt-1">Start trading to begin messaging</p>
                  </div>
                ) : conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`flex-shrink-0 w-72 p-3 rounded-lg cursor-pointer transition-all duration-200 border ${
                      selectedChat === conversation.id 
                        ? 'bg-primary/10 border-primary/20' 
                        : 'bg-muted/30 border-border hover:bg-background/50'
                    }`}
                    onClick={() => setSelectedChat(conversation.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={conversation.user.avatar} />
                          <AvatarFallback>{conversation.user.name.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full flex items-center justify-center ${getTradeStatusColor(conversation.tradeStatus)}`}>
                          {getTradeStatusIcon(conversation.tradeStatus)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm truncate">{conversation.user.name}</span>
                          <span className="text-xs text-muted-foreground">{conversation.timestamp}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mb-1">{conversation.lastMessage}</p>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                            {conversation.tradeStatus}
                          </Badge>
                          {conversation.unread > 0 && (
                            <div className="h-5 w-5 bg-primary rounded-full flex items-center justify-center">
                              <span className="text-xs text-white">{conversation.unread}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Desktop: Sidebar - Conversations List */}
          <div className="hidden md:flex w-80 bg-muted/30 border-r flex-col">
            {/* Header */}
            <div className="p-4 border-b bg-background/50">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">Messages</h2>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-background"
                />
              </div>
            </div>

            {/* Conversations List */}
            <ScrollArea className="flex-1">
              <div className="p-2">
                {conversations.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <h3 className="text-lg font-medium mb-2">No conversations yet</h3>
                    <p className="text-sm mb-4">Start trading to begin conversations</p>
                    <Button variant="outline" size="sm" onClick={onClose}>
                      Browse Cards
                    </Button>
                  </div>
                ) : conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`p-3 rounded-lg cursor-pointer transition-all duration-200 mb-1 ${
                      selectedChat === conversation.id 
                        ? 'bg-primary/10 border border-primary/20' 
                        : 'hover:bg-background/50'
                    }`}
                    onClick={() => setSelectedChat(conversation.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={conversation.user.avatar} />
                          <AvatarFallback>{conversation.user.name.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full flex items-center justify-center ${getTradeStatusColor(conversation.tradeStatus)}`}>
                          {getTradeStatusIcon(conversation.tradeStatus)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm truncate">{conversation.user.name}</span>
                          <span className="text-xs text-muted-foreground">{conversation.timestamp}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mb-1">{conversation.lastMessage}</p>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                            {conversation.tradeStatus}
                          </Badge>
                          {conversation.unread > 0 && (
                            <div className="h-5 w-5 bg-primary rounded-full flex items-center justify-center">
                              <span className="text-xs text-white">{conversation.unread}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col bg-background">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-3 md:p-4 border-b bg-background flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 md:h-10 md:w-10">
                      <AvatarImage src={selectedConversation.user.avatar} />
                      <AvatarFallback>{selectedConversation.user.name.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm md:text-base">{selectedConversation.user.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {selectedConversation.tradeStatus}
                        </Badge>
                      </div>
                      <span className="text-xs md:text-sm text-muted-foreground">Active trader • Online now</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 md:gap-2">
                    {selectedConversation.tradeStatus === 'negotiating' && (
                      <Button size="sm" variant="outline" className="text-xs" onClick={openTradeProposal}>
                        <ArrowLeftRight className="h-3 w-3 mr-1" />
                        Propose Trade
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 md:h-10 md:w-10">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Trade Proposal Modal */}
                {showTradeProposal && (
                  <div className="p-4 bg-muted/50 border-b">
                    <div className="bg-background rounded-lg p-4 border">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold">Create Trade Proposal</h4>
                        <Button size="sm" variant="ghost" onClick={() => setShowTradeProposal(false)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-sm font-medium">Your Cards</label>
                            <div className="border rounded p-2 text-sm text-muted-foreground">
                              Select from collection...
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Their Cards</label>
                            <div className="border rounded p-2 text-sm text-muted-foreground">
                              {selectedConversation.user.name}'s cards...
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" className="flex-1">Send Proposal</Button>
                          <Button size="sm" variant="outline" onClick={() => setShowTradeProposal(false)}>Cancel</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Messages */}
                <ScrollArea className="flex-1 p-3 md:p-4">
                  <div className="space-y-3 md:space-y-4">
                    {selectedConversation.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[85%] md:max-w-xs lg:max-w-md px-3 md:px-4 py-2 rounded-2xl ${
                          message.sender === 'me'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}>
                          {message.type === 'image' && message.imageUrl ? (
                            <div className="mb-2">
                              <SmartImage
                                src={message.imageUrl}
                                alt="Shared image"
                                className="max-w-full h-auto rounded-lg"
                                style={{ maxHeight: '200px' }}
                              />
                            </div>
                          ) : (
                            <p className="text-sm">{message.text}</p>
                          )}
                          <span className={`text-xs ${
                            message.sender === 'me' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                          }`}>
                            {message.time}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="p-3 md:p-4 border-t bg-background">
                  <div className="flex gap-2 items-end">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 md:h-10 md:w-10"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImageIcon className="h-4 w-4" />
                    </Button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <div className="flex-1 bg-muted rounded-full px-3 md:px-4 py-2 flex items-center gap-2">
                      <Input
                        placeholder="Type a message..."
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
                      />
                    </div>
                    <Button 
                      onClick={sendMessage} 
                      size="icon" 
                      className="rounded-full h-8 w-8 md:h-10 md:w-10"
                      disabled={!messageInput.trim()}
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
                    {conversations.length === 0 ? "No conversations yet" : "No conversation selected"}
                  </h3>
                  <p className="text-xs md:text-sm">
                    {conversations.length === 0 
                      ? "Start trading cards to begin conversations with other users" 
                      : "Choose a conversation to start messaging"
                    }
                  </p>
                  {conversations.length === 0 && (
                    <Button variant="outline" size="sm" className="mt-4" onClick={onClose}>
                      Browse Cards
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SocialTradeHub;
