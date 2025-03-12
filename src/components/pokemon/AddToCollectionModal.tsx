
import React, { useState } from "react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PokemonSet } from "@/services/pokemonSetsApi";

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
  { value: "PSA", label: "PSA" },
  { value: "BGS", label: "BGS" },
  { value: "SGC", label: "SGC" },
];

const formSchema = z.object({
  quantity: z.coerce.number().min(1, "Quantity must be at least 1").default(1),
  condition: z.string().min(1, "Please select a condition"),
  isGraded: z.boolean().default(false),
  gradingCompany: z.string().optional(),
  grade: z.coerce.number().min(1).max(10).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AddToCollectionModalProps {
  set: PokemonSet;
  open: boolean;
  onClose: () => void;
}

const AddToCollectionModal = ({ set, open, onClose }: AddToCollectionModalProps) => {
  const { toast } = useToast();
  const [isGraded, setIsGraded] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity: 1,
      condition: "NM",
      isGraded: false,
    },
  });
  
  const onSubmit = (data: FormValues) => {
    // In a real app, this would save to a database
    console.log("Adding to collection:", {
      set: set.id,
      ...data
    });
    
    toast({
      title: "Cards added to collection!",
      description: `Added ${data.quantity} cards from ${set.name} set`,
    });
    
    onClose();
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add to Collection</DialogTitle>
          <DialogDescription>
            Add cards from {set.name} to your collection
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                    How many cards to add
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
                    The condition of the cards
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isGraded"
                checked={isGraded}
                onChange={(e) => {
                  setIsGraded(e.target.checked);
                  form.setValue("isGraded", e.target.checked);
                  if (!e.target.checked) {
                    form.setValue("gradingCompany", undefined);
                    form.setValue("grade", undefined);
                  }
                }}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="isGraded" className="text-sm font-medium">
                Is this card graded?
              </label>
            </div>
            
            {isGraded && (
              <div className="space-y-4">
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
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Add to Collection</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddToCollectionModal;
