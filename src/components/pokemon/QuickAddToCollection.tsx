
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { PokemonCard } from "@/services/pokemonTcgApi";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Define card condition options
export const cardConditions = [
  { value: "M", label: "Mint (M)" },
  { value: "NM", label: "Near Mint (NM)" },
  { value: "LP", label: "Lightly Played (LP)" },
  { value: "MP", label: "Moderately Played (MP)" },
  { value: "HP", label: "Heavily Played (HP)" },
  { value: "D", label: "Damaged (D)" },
];

// Define grading companies
export const gradingCompanies = [
  { value: "PSA", label: "PSA (Professional Sports Authenticator)" },
  { value: "BGS", label: "BGS (Beckett Grading Services)" },
  { value: "CGC", label: "CGC (Certified Guaranty Company)" },
  { value: "SGC", label: "SGC (Sportscard Guaranty)" },
  { value: "GMA", label: "GMA (Global Authentication Inc.)" },
  { value: "AGS", label: "AGS (Ace Grading)" },
];

const formSchema = z.object({
  quantity: z.coerce.number().min(1, "Quantity must be at least 1").default(1),
  condition: z.string().min(1, "Please select a condition"),
  isGraded: z.boolean().default(false),
  gradingCompany: z.string().optional(),
  grade: z.coerce.number().min(1).max(10).optional(),
  tradePreferences: z.string().optional(),
  forTrade: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

interface QuickAddToCollectionProps {
  card: PokemonCard;
}

const QuickAddToCollection = ({ card }: QuickAddToCollectionProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isGraded, setIsGraded] = useState(false);
  const [forTrade, setForTrade] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity: 1,
      condition: "NM",
      isGraded: false,
      forTrade: false,
      tradePreferences: "",
    },
  });
  
  const onSubmit = (data: FormValues) => {
    // In a real app, this would save to a database
    console.log("Adding to collection:", {
      card: card.id,
      cardName: card.name,
      setId: card.set.id,
      setName: card.set.name,
      ...data
    });
    
    toast({
      title: "Card added to collection!",
      description: `Added ${data.quantity} ${card.name} card(s) to your collection`,
    });
    
    setOpen(false);
  };
  
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="w-full">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add to Collection
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add to Collection</SheetTitle>
          <SheetDescription>
            Add {card.name} from {card.set.name} to your collection
          </SheetDescription>
        </SheetHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="1"
                      min={1}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    How many of this card to add
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="condition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Condition</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {cardConditions.map((condition) => (
                        <SelectItem key={condition.value} value={condition.value}>
                          {condition.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The condition of the card
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="isGraded"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        setIsGraded(checked === true);
                        if (checked === false) {
                          form.setValue("gradingCompany", undefined);
                          form.setValue("grade", undefined);
                        }
                      }}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Graded Card</FormLabel>
                    <FormDescription>
                      Check if this card has been professionally graded
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            
            {isGraded && (
              <div className="space-y-4 border rounded-md p-4 bg-muted/30">
                <FormField
                  control={form.control}
                  name="gradingCompany"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Grading Company</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select grading company" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {gradingCompanies.map((company) => (
                            <SelectItem key={company.value} value={company.value}>
                              {company.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="grade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Grade (1-10)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="9"
                          min={1}
                          max={10}
                          step={0.5}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
            
            <FormField
              control={form.control}
              name="forTrade"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        setForTrade(checked === true);
                        if (checked === false) {
                          form.setValue("tradePreferences", "");
                        }
                      }}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Available for Trade</FormLabel>
                    <FormDescription>
                      Mark this card as available for trading with other collectors
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            
            {forTrade && (
              <FormField
                control={form.control}
                name="tradePreferences"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trade Preferences</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="I'm looking for Pikachu cards, sealed products, or Base Set cards..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      What would you like to trade this card for?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <div className="pt-4 flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Add to Collection</Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
};

export default QuickAddToCollection;
