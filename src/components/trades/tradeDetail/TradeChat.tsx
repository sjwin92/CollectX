import { useRef, useState, type ChangeEvent } from "react";
import { format } from "date-fns";
import { Loader2, Paperclip, SendHorizontal, X } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import GlassCard from "@/components/ui/custom/GlassCard";
import { useToast } from "@/hooks/use-toast";
import { addTradeMessage, uploadTradeImage } from "@/services/tradeService";
import type { TradeProposal } from "@/models/escrow";
import { SmartImage } from "@/components/common/SmartImage";

type Props = {
  trade: TradeProposal;
  tradeId: string;
  currentUserId: string | undefined;
  onMessageSent: () => void;
  onOpenLightbox: (url: string) => void;
};

export const TradeChat = ({ trade, tradeId, currentUserId, onMessageSent, onOpenLightbox }: Props) => {
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutate: sendMessage, isPending: isSending } = useMutation({
    mutationFn: ({ message, imageUrl }: { message: string; imageUrl: string | null }) =>
      addTradeMessage(tradeId, message, imageUrl),
    onSuccess: () => {
      setNewMessage("");
      onMessageSent();
    },
    onError: () =>
      toast({
        variant: "destructive",
        title: "Couldn't send message",
        description: "There was a problem sending your message.",
      }),
  });

  const { mutate: uploadImage, isPending: isUploading } = useMutation({
    mutationFn: (file: File) => uploadTradeImage(file),
    onSuccess: (imageUrl) => {
      sendMessage({
        message: newMessage.trim() || "I've shared an image with you.",
        imageUrl,
      });
      setSelectedImage(null);
      setImagePreview(null);
    },
    onError: () =>
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "There was a problem uploading your image.",
      }),
  });

  const onPickImage = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = () => {
    if (!newMessage.trim() && !selectedImage) return;
    if (selectedImage) uploadImage(selectedImage);
    else sendMessage({ message: newMessage, imageUrl: null });
  };

  return (
    <GlassCard>
      <div className="p-4">
        <h3 className="text-lg font-medium mb-4">Trade Chat</h3>
        <ScrollArea className="h-[300px] mb-4">
          <div className="space-y-2">
            {trade.messages.map((msg) => {
              const isMine = msg.userId === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`p-3 rounded-md ${
                    isMine
                      ? "bg-primary/10 text-right ml-auto w-fit max-w-[75%]"
                      : "bg-secondary/10 text-left mr-auto w-fit max-w-[75%]"
                  }`}
                >
                  <div className="text-xs text-muted-foreground">
                    {isMine ? "You" : msg.username}
                  </div>
                  {msg.message && <div className="mb-2">{msg.message}</div>}
                  {msg.imageUrl && (
                    <div
                      className="cursor-pointer rounded-md overflow-hidden mb-2"
                      onClick={() => onOpenLightbox(msg.imageUrl!)}
                    >
                      <SmartImage src={msg.imageUrl} alt="Trade image" className="max-h-48 object-cover" />
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(msg.createdAt), "Pp")}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="flex items-end gap-2">
          <input
            type="file"
            className="hidden"
            ref={fileInputRef}
            accept="image/*"
            onChange={onPickImage}
          />
          {imagePreview ? (
            <div className="relative h-20 w-20 rounded-md overflow-hidden border border-border">
              <SmartImage src={imagePreview} alt="Selected" className="h-full w-full object-cover" />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-0 right-0 bg-black/50 rounded-full h-5 w-5 p-0.5"
                onClick={removeImage}
              >
                <X className="h-3 w-3 text-white" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          )}

          <Textarea
            placeholder="Type your message..."
            className="flex-1 resize-none"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            onClick={handleSend}
            disabled={(!newMessage.trim() && !selectedImage) || isSending || isUploading}
          >
            {isSending || isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <SendHorizontal className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </GlassCard>
  );
};
