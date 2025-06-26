
import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { PokemonCard } from "@/services/api/pokemonTypes";
import { CardItemProps } from "@/components/cards/CardItem";
import { Label } from "@/components/ui/label";
import CardImageUpload from "./CardImageUpload";
import { UploadedCardImage } from "@/services/cardImageUploadService";
import { ExtendedCardItemProps } from "@/types/cardTypes";

interface CardCollectionFormProps {
  card: PokemonCard;
  onSubmit: (data: ExtendedCardItemProps) => void;
  onCancel: () => void;
  initialData?: Partial<CardItemProps>;
}

interface CardFormData {
  condition: string;
  graded: boolean;
  gradeScore?: string;
  gradingCompany?: string;
  forTrade: boolean;
  estimatedValue: string;
}

const formSchema = z.object({
  condition: z.string().min(2, {
    message: "Condition must be at least 2 characters.",
  }),
  graded: z.boolean().default(false),
  gradeScore: z.string().optional(),
  gradingCompany: z.string().optional(),
  forTrade: z.boolean().default(false),
  estimatedValue: z.string().optional(),
});

const FormFieldWrapper = ({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) => (
  <div className="grid gap-2">
    <div className="grid gap-0.5">
      <Label htmlFor="email">{title}</Label>
      {description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
    </div>
    {children}
  </div>
);

const CardCollectionForm = ({ card, onSubmit, onCancel, initialData }: CardCollectionFormProps) => {
  const form = useForm<CardFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      condition: initialData?.condition || "",
      graded: initialData?.graded || false,
      gradeScore: initialData?.gradeScore || "",
      gradingCompany: initialData?.gradingCompany || "",
      forTrade: initialData?.forTrade || false,
      estimatedValue: initialData?.estimatedValue || "",
    },
  });
  
  const [uploadedImages, setUploadedImages] = useState<UploadedCardImage[]>([]);

  const handleImageUploaded = (image: UploadedCardImage) => {
    setUploadedImages(prev => [...prev, image]);
  };

  const handleImageRemoved = (imageId: string) => {
    setUploadedImages(prev => prev.filter(img => img.id !== imageId));
  };

  const onFormSubmit = (values: CardFormData) => {
    const cardData: ExtendedCardItemProps = {
      id: card.id,
      name: card.name,
      imageUrl: card.images.small,
      rarity: card.rarity,
      set: card.set,
      number: card.number,
      condition: values.condition,
      graded: values.graded,
      gradeScore: values.gradeScore,
      gradingCompany: values.gradingCompany,
      forTrade: values.forTrade,
      estimatedValue: values.estimatedValue,
      conditionImages: uploadedImages,
    };
    
    onSubmit(cardData);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Card Preview</CardTitle>
          <CardDescription>
            This is how the card will appear in your collection.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center space-x-4">
            <div className="space-y-1">
              <p className="text-sm font-medium leading-none">{card.name}</p>
              <p className="text-sm text-muted-foreground">
                {card.set.name} - {card.rarity}
              </p>
            </div>
          </div>
          <img src={card.images.small} alt={card.name} className="rounded-md" />
        </CardContent>
      </Card>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="condition"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Condition</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a condition" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="mint">Mint</SelectItem>
                    <SelectItem value="near_mint">Near Mint</SelectItem>
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="played">Played</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="graded"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Graded</FormLabel>
                  <FormDescription>Is this card professionally graded?</FormDescription>
                </div>
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {form.watch("graded") && (
            <>
              <FormField
                control={form.control}
                name="gradeScore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grade Score</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 9.5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gradingCompany"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grading Company</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., PSA" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          <FormField
            control={form.control}
            name="forTrade"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">For Trade</FormLabel>
                  <FormDescription>
                    Are you willing to trade this card?
                  </FormDescription>
                </div>
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="estimatedValue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estimated Value</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., $25.00" type="text" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Card Condition Images */}
          <FormFieldWrapper
            title="Card Condition Photos"
            description="Upload photos showing the condition of your card"
          >
            <CardImageUpload
              cardId={card.id}
              userId="current_user_id" // Would get from auth context
              existingImages={uploadedImages}
              onImageUploaded={handleImageUploaded}
              onImageRemoved={handleImageRemoved}
              maxImages={3}
            />
          </FormFieldWrapper>
          
          <div className="flex justify-end space-x-2">
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">Submit</Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default CardCollectionForm;
