
import React, { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { CardFormValues } from "./cardFormSchema";
import { Input } from "@/components/ui/input";
import FormFieldWrapper from "./FormFieldWrapper";
import { Button } from "@/components/ui/button";
import { PlusCircle, X } from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";

interface TradeFieldsProps {
  form: UseFormReturn<CardFormValues>;
}

// Common Pokemon card types/categories for trading
const commonCardCategories = [
  { value: "charizard", label: "Charizard Cards" },
  { value: "pikachu", label: "Pikachu Cards" },
  { value: "eevee", label: "Eevee/Eeveelutions" },
  { value: "fullart", label: "Full Art Trainers" },
  { value: "vmax", label: "VMAX Cards" },
  { value: "vstar", label: "VSTAR Cards" },
  { value: "ex", label: "EX Cards" },
  { value: "gx", label: "GX Cards" },
  { value: "gold", label: "Gold Cards" },
  { value: "rainbow", label: "Rainbow Rare" },
  { value: "alt", label: "Alt Art" },
  { value: "vintage", label: "Vintage Cards" },
];

const TradeFields = ({ form }: TradeFieldsProps) => {
  const [preferences, setPreferences] = useState<string[]>([]);
  const [customPreference, setCustomPreference] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  // Update form value whenever preferences change
  React.useEffect(() => {
    const formattedPreferences = preferences.join(", ");
    form.setValue("tradePreferences", formattedPreferences);
  }, [preferences, form]);

  const addPreference = () => {
    if (customPreference.trim()) {
      setPreferences([...preferences, customPreference.trim()]);
      setCustomPreference("");
    }
  };

  const addCategory = (category: string) => {
    const label = commonCardCategories.find(c => c.value === category)?.label;
    if (label && !preferences.includes(label)) {
      setPreferences([...preferences, label]);
      setSelectedCategory("");
    }
  };

  const removePreference = (index: number) => {
    const newPreferences = [...preferences];
    newPreferences.splice(index, 1);
    setPreferences(newPreferences);
  };

  return (
    <FormFieldWrapper
      form={form}
      name="tradePreferences"
      label="Trade Preferences"
      description="What would you like to trade this card for?"
    >
      <div className="space-y-3">
        {/* Common categories dropdown */}
        <div className="flex gap-2">
          <Select 
            value={selectedCategory} 
            onValueChange={(value) => {
              setSelectedCategory(value);
              addCategory(value);
            }}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select common card types" />
            </SelectTrigger>
            <SelectContent>
              {commonCardCategories.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Custom input field */}
        <div className="flex gap-2">
          <Input
            placeholder="Add specific card (e.g., Charizard VMAX)"
            value={customPreference}
            onChange={(e) => setCustomPreference(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addPreference();
              }
            }}
          />
          <Button 
            type="button" 
            size="sm" 
            variant="secondary"
            onClick={addPreference}
          >
            <PlusCircle className="h-4 w-4" />
          </Button>
        </div>

        {/* Hidden input for form submission */}
        <input 
          type="hidden" 
          {...form.register("tradePreferences")} 
        />

        {/* Show selected preferences as tags */}
        {preferences.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {preferences.map((pref, index) => (
              <div 
                key={index} 
                className="bg-muted px-2 py-1 rounded-md flex items-center gap-1 text-sm"
              >
                <span>{pref}</span>
                <button 
                  type="button" 
                  onClick={() => removePreference(index)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </FormFieldWrapper>
  );
};

export default TradeFields;
