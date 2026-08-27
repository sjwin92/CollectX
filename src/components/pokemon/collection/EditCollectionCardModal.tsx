import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ExtendedCardItemWithDB, updateCardInCollection, removeCardFromCollection } from '@/services/supabaseCollectionService';
import { uploadUserCardImage, getUserCardImages, deleteCardImage, setPrimaryImage } from '@/services/cardImageUploadService';
import { CARD_CONDITIONS, normalizeCondition } from '@/lib/cardCondition';
import { Camera, Upload, X, Star, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { SmartImage } from '@/components/common/SmartImage';

interface EditCollectionCardModalProps {
  card: ExtendedCardItemWithDB | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

const EditCollectionCardModal: React.FC<EditCollectionCardModalProps> = ({
  card,
  isOpen,
  onClose,
  onUpdated
}) => {
  const [quantity, setQuantity] = useState(1);
  const [condition, setCondition] = useState('NM');
  const [isGraded, setIsGraded] = useState(false);
  const [gradingCompany, setGradingCompany] = useState('');
  const [gradeScore, setGradeScore] = useState('');
  const [forTrade, setForTrade] = useState(false);
  const [tradePreferences, setTradePreferences] = useState('');
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<any[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (card) {
      setQuantity(card.quantity || 1);
      setCondition(normalizeCondition(card.condition));
      setIsGraded(card.graded || false);
      setGradingCompany(card.gradingCompany || '');
      setGradeScore(card.gradeScore || '');
      setForTrade(card.forTrade || false);
      setTradePreferences(card.tradePreferences || '');
      
      // Load existing images
      if (card.dbId) {
        loadImages(card.dbId);
      }
    }
  }, [card]);

  const loadImages = async (userCardId: string) => {
    try {
      const imageData = await getUserCardImages(userCardId);
      setImages(imageData);
    } catch (error) {
      console.error('Error loading images:', error);
    }
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || !card?.dbId) return;

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        if (!file.type.startsWith('image/')) {
          toast({
            title: "Invalid file",
            description: "Please select only image files.",
            variant: "destructive"
          });
          continue;
        }

        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: "File too large",
            description: "Please select images smaller than 10MB.",
            variant: "destructive"
          });
          continue;
        }

        await uploadUserCardImage(file, card.dbId);
      }
      
      await loadImages(card.dbId);
      toast({
        title: "Images uploaded!",
        description: `Successfully uploaded ${files.length} image(s).`
      });
    } catch (error) {
      console.error('Error uploading images:', error);
      toast({
        title: "Upload failed",
        description: "There was an error uploading your images.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!card?.dbId) return;

    setIsSubmitting(true);
    try {
      await updateCardInCollection(card.dbId, {
        quantity,
        condition,
        graded: isGraded,
        gradingCompany: isGraded ? gradingCompany : undefined,
        gradeScore: isGraded ? gradeScore : undefined,
        forTrade,
        tradePreferences: forTrade ? tradePreferences : undefined
      });

      toast(
        quantity === 0
          ? { title: "Removed from collection", description: card.name }
          : { title: "Card updated", description: "Your changes have been saved." }
      );

      onUpdated();
      onClose();
    } catch (error) {
      console.error('Error updating card:', error);
      toast({
        title: "Update failed",
        description: "There was an error updating your card.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleImageUpload(e.dataTransfer.files);
  };

  const handleRemoveCard = async () => {
    if (!card?.dbId) return;
    setRemoving(true);
    try {
      await removeCardFromCollection(card.dbId);
      toast({ title: 'Removed from collection', description: card.name });
      onUpdated();
      onClose();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: "Couldn't remove the card",
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setRemoving(false);
      setConfirmRemove(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!card?.dbId) return;
    try {
      await deleteCardImage(imageId);
      await loadImages(card.dbId);
    } catch (error) {
      toast({ variant: 'destructive', title: "Couldn't delete photo", description: error instanceof Error ? error.message : 'Try again.' });
    }
  };

  const handleSetPrimary = async (imageId: string) => {
    if (!card?.dbId) return;
    try {
      await setPrimaryImage(imageId, card.dbId);
      await loadImages(card.dbId);
    } catch (error) {
      toast({ variant: 'destructive', title: "Couldn't set primary photo", description: error instanceof Error ? error.message : 'Try again.' });
    }
  };

  if (!card) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Edit {card.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Card Info */}
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
            <SmartImage
              src={card.imageUrl}
              alt={card.name}
              className="w-16 h-22 object-cover rounded"
            />
            <div>
              <h3 className="font-medium">{card.name}</h3>
              <p className="text-sm text-muted-foreground">{card.set?.name} #{card.number}</p>
              <p className="text-sm text-muted-foreground">{card.rarity}</p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value, 10) || 0))}
                min="0"
              />
              {quantity === 0 && (
                <p className="text-xs text-destructive">Saving with 0 removes this card from your collection.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="condition">Condition</Label>
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CARD_CONDITIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Grading */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="graded" 
                checked={isGraded} 
                onCheckedChange={(checked) => setIsGraded(checked === true)}
              />
              <Label htmlFor="graded">Graded Card</Label>
            </div>

            {isGraded && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company">Grading Company</Label>
                  <Select value={gradingCompany} onValueChange={setGradingCompany}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select company" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PSA">PSA</SelectItem>
                      <SelectItem value="BGS">BGS</SelectItem>
                      <SelectItem value="CGC">CGC</SelectItem>
                      <SelectItem value="SGC">SGC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grade">Grade Score</Label>
                  <Input 
                    id="grade"
                    value={gradeScore}
                    onChange={(e) => setGradeScore(e.target.value)}
                    placeholder="e.g., 10, 9.5"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Trading */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="trade" 
                checked={forTrade} 
                onCheckedChange={(checked) => setForTrade(checked === true)}
              />
              <Label htmlFor="trade">Available for Trade</Label>
            </div>

            {forTrade && (
              <div className="space-y-2">
                <Label htmlFor="preferences">Trade Preferences</Label>
                <Textarea 
                  id="preferences"
                  value={tradePreferences}
                  onChange={(e) => setTradePreferences(e.target.value)}
                  placeholder="What cards are you looking for?"
                />
              </div>
            )}
          </div>

          {/* Image Upload */}
          <div className="space-y-4">
            <Label>Condition Photos ({images.length}/5)</Label>
            
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragOver 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }`}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
            >
              <Upload className="mx-auto h-8 w-8 mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                Drag and drop images here, or click to select
              </p>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                id="image-upload"
                onChange={(e) => handleImageUpload(e.target.files)}
                disabled={uploading || images.length >= 5}
              />
              <Label htmlFor="image-upload" className="cursor-pointer">
                <Button 
                  variant="outline" 
                  disabled={uploading || images.length >= 5}
                  asChild
                >
                  <span>
                    {uploading ? 'Uploading...' : 'Choose Images'}
                  </span>
                </Button>
              </Label>
            </div>

            {/* Image Grid */}
            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-4">
                {images.map((image) => (
                  <Card key={image.id} className="group relative overflow-hidden">
                    <CardContent className="p-0">
                      <div className="aspect-square relative">
                        <img
                          src={image.image_url}
                          alt="Card condition"
                          className="w-full h-full object-cover"
                        />
                        {image.is_primary && (
                          <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs">
                            Primary
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/70 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                          {!image.is_primary ? (
                            <button
                              type="button"
                              onClick={() => handleSetPrimary(image.id)}
                              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-white hover:bg-white/15"
                            >
                              <Star className="h-3 w-3" /> Primary
                            </button>
                          ) : <span />}
                          <button
                            type="button"
                            onClick={() => handleDeleteImage(image.id)}
                            className="rounded px-1.5 py-0.5 text-white hover:bg-red-500/40"
                            aria-label="Delete photo"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-4">
            <Button
              variant={confirmRemove ? 'destructive' : 'ghost'}
              className={confirmRemove ? '' : 'text-muted-foreground hover:text-destructive'}
              disabled={removing}
              onClick={() => (confirmRemove ? handleRemoveCard() : setConfirmRemove(true))}
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              {removing ? 'Removing…' : confirmRemove ? 'Confirm remove' : 'Remove from collection'}
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditCollectionCardModal;