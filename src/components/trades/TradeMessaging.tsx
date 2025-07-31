import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import OptimizedImage from '@/components/ui/OptimizedImage';
import { SendHorizontal, Paperclip, X, Image as ImageIcon, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/hooks/useUser';
import EscrowPaymentModal from './EscrowPaymentModal';
import { 
  createEscrowTransaction, 
  getEscrowByTradeId, 
  updateEscrowPayment,
  type EscrowTransaction 
} from '@/services/supabaseEscrowService';

interface TradeMessage {
  id: string;
  trade_id: string;
  user_id: string;
  message: string;
  message_type: string;
  created_at: string;
  sender?: {
    display_name?: string;
    username?: string;
    avatar_url?: string;
  };
}

interface Trade {
  id: string;
  status: string;
  initiator_user_id: string;
  recipient_user_id: string;
  initiator_value: number;
  recipient_value: number;
}

interface TradeMessagingProps {
  trade: Trade;
}

const TradeMessaging = ({ trade }: TradeMessagingProps) => {
  const [messages, setMessages] = useState<TradeMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [escrow, setEscrow] = useState<EscrowTransaction | null>(null);
  const [showEscrowModal, setShowEscrowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    if (trade.id) {
      loadMessages();
      loadEscrow();
      subscribeToMessages();
    }
  }, [trade.id]);

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from('trade_messages')
      .select('*')
      .eq('trade_id', trade.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    // Get sender profiles separately
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(msg => msg.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, username, avatar_url')
        .in('user_id', userIds);

      const messagesWithSenders = data.map(msg => ({
        ...msg,
        sender: profiles?.find(p => p.user_id === msg.user_id) || {}
      }));

      setMessages(messagesWithSenders);
    } else {
      setMessages(data || []);
    }
  };

  const loadEscrow = async () => {
    try {
      const escrowData = await getEscrowByTradeId(trade.id);
      setEscrow(escrowData);
    } catch (error) {
      console.error('Error loading escrow:', error);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`trade_messages:${trade.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trade_messages',
          filter: `trade_id=eq.${trade.id}`
        },
        (payload) => {
          loadMessages(); // Reload to get sender info
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('trade_messages')
        .insert({
          trade_id: trade.id,
          user_id: user.id,
          message: newMessage,
          message_type: 'text'
        });

      if (error) throw error;

      setNewMessage('');
      toast({
        title: "Message sent",
        description: "Your message has been sent to the other trader."
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: "destructive",
        title: "Failed to send message",
        description: "Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleInitiateEscrow = async () => {
    if (!user) return;
    
    try {
      const otherUserId = user.id === trade.initiator_user_id ? trade.recipient_user_id : trade.initiator_user_id;
      
      const escrowData = await createEscrowTransaction(
        trade.id,
        trade.initiator_user_id,
        trade.recipient_user_id,
        trade.initiator_value,
        trade.recipient_value
      );
      
      setEscrow(escrowData);
      setShowEscrowModal(true);
      
      // Send system message
      await supabase
        .from('trade_messages')
        .insert({
          trade_id: trade.id,
          user_id: user.id,
          message: 'Escrow protection has been initiated for this trade.',
          message_type: 'system'
        });
        
    } catch (error) {
      console.error('Error initiating escrow:', error);
      toast({
        variant: "destructive",
        title: "Failed to initiate escrow",
        description: "Please try again."
      });
    }
  };

  const handleEscrowPayment = async (paymentId: string) => {
    if (!escrow || !user) return;
    
    try {
      const updatedEscrow = await updateEscrowPayment(
        escrow.id,
        user.id,
        paymentId,
        user.id === escrow.initiator_user_id ? escrow.initiator_escrow_amount : escrow.recipient_escrow_amount
      );
      
      setEscrow(updatedEscrow);
      
      // Send system message
      await supabase
        .from('trade_messages')
        .insert({
          trade_id: trade.id,
          user_id: user.id,
          message: 'Escrow payment completed.',
          message_type: 'system'
        });
        
    } catch (error) {
      console.error('Error updating escrow payment:', error);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-4">
      {/* Escrow Status */}
      {escrow && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-600" />
              Escrow Protection
              <Badge variant={escrow.status === 'completed' ? 'default' : 'secondary'}>
                {escrow.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium">Your escrow:</div>
                <div className="text-muted-foreground">
                  ${(user.id === escrow.initiator_user_id ? escrow.initiator_escrow_amount : escrow.recipient_escrow_amount).toFixed(2)}
                  {user.id === escrow.initiator_user_id ? 
                    (escrow.initiator_paid ? ' (Paid)' : ' (Pending)') :
                    (escrow.recipient_paid ? ' (Paid)' : ' (Pending)')
                  }
                </div>
              </div>
              <div className="text-right">
                {!(user.id === escrow.initiator_user_id ? escrow.initiator_paid : escrow.recipient_paid) && (
                  <Button size="sm" onClick={() => setShowEscrowModal(true)}>
                    Pay Escrow
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trade Actions */}
      {!escrow && trade.status === 'accepted' && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Secure this trade</h4>
                <p className="text-sm text-muted-foreground">
                  Add escrow protection for safer trading
                </p>
              </div>
              <Button onClick={handleInitiateEscrow} variant="outline">
                <Shield className="h-4 w-4 mr-2" />
                Start Escrow
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Messages */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Trade Discussion</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] mb-4 pr-4">
            <div className="space-y-4">
              {messages.map((message) => {
                const isOwnMessage = message.user_id === user.id;
                const isSystemMessage = message.message_type === 'system';
                
                if (isSystemMessage) {
                  return (
                    <div key={message.id} className="flex justify-center">
                      <Badge variant="secondary" className="text-xs">
                        {message.message}
                      </Badge>
                    </div>
                  );
                }
                
                return (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={message.sender?.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {(message.sender?.display_name || message.sender?.username || 'U').substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} max-w-[70%]`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-muted-foreground">
                          {isOwnMessage ? 'You' : (message.sender?.display_name || message.sender?.username || 'Trader')}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(message.created_at), 'HH:mm')}
                        </span>
                      </div>
                      
                      <div
                        className={`rounded-lg px-3 py-2 ${
                          isOwnMessage
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm">{message.message}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {/* Image Preview */}
          {imagePreview && (
            <div className="mb-4 p-3 border rounded-lg bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Image to send:</span>
                <Button size="icon" variant="ghost" onClick={removeSelectedImage}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <OptimizedImage 
                src={imagePreview} 
                alt="Preview" 
                className="max-h-32 rounded" 
                useAI={false}
                lazy={false}
              />
            </div>
          )}

          {/* Message Input */}
          <div className="flex gap-2">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
              id="image-upload"
            />
            
            <Button
              size="icon"
              variant="outline"
              onClick={() => document.getElementById('image-upload')?.click()}
              disabled={isLoading}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            
            <Textarea
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 min-h-[40px] max-h-[120px]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={isLoading}
            />
            
            <Button 
              onClick={handleSendMessage} 
              disabled={!newMessage.trim() || isLoading}
            >
              <SendHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Escrow Payment Modal */}
      {escrow && (
        <EscrowPaymentModal
          isOpen={showEscrowModal}
          onClose={() => setShowEscrowModal(false)}
          escrow={escrow}
          currentUserId={user.id}
          onPaymentComplete={handleEscrowPayment}
        />
      )}
    </div>
  );
};

export default TradeMessaging;