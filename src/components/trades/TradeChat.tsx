
import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TradeMessage } from '@/models/escrow';
import { SendHorizontal, Paperclip, X, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';

interface TradeChatProps {
  messages: TradeMessage[];
  onSendMessage: (message: string, imageUrl?: string) => void;
  onSendImage: (file: File) => void;
  currentUserId: string;
  isLoading?: boolean;
}

const TradeChat = ({ 
  messages, 
  onSendMessage, 
  onSendImage, 
  currentUserId,
  isLoading = false 
}: TradeChatProps) => {
  const [newMessage, setNewMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSendMessage = () => {
    if (!newMessage.trim() && !selectedImage) return;
    
    if (selectedImage) {
      onSendImage(selectedImage);
      setSelectedImage(null);
      setImagePreview(null);
    } else {
      onSendMessage(newMessage);
    }
    
    setNewMessage('');
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Trade Discussion</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] mb-4 pr-4">
          <div className="space-y-4">
            {messages.map((message) => {
              const isOwnMessage = message.userId === currentUserId;
              return (
                <div
                  key={message.id}
                  className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" alt={message.username} />
                    <AvatarFallback className="text-xs">
                      {message.username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} max-w-[70%]`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-muted-foreground">
                        {isOwnMessage ? 'You' : message.username}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(message.createdAt), 'HH:mm')}
                      </span>
                    </div>
                    
                    <div
                      className={`rounded-lg px-3 py-2 ${
                        isOwnMessage
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      } ${message.systemMessage ? 'bg-amber-100 text-amber-800 text-sm italic' : ''}`}
                    >
                      {message.imageUrl && (
                        <div className="mb-2">
                          <img
                            src={message.imageUrl}
                            alt="Shared image"
                            className="max-w-full h-auto rounded-md cursor-pointer"
                            onClick={() => window.open(message.imageUrl!, '_blank')}
                          />
                        </div>
                      )}
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
            <img src={imagePreview} alt="Preview" className="max-h-32 rounded" />
          </div>
        )}

        {/* Message Input */}
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageSelect}
          />
          
          <Button
            size="icon"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
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
            disabled={(!newMessage.trim() && !selectedImage) || isLoading}
          >
            <SendHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TradeChat;
