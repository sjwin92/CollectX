
import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { UseFormReturn } from "react-hook-form";

interface SealedProductFieldsProps {
  form: UseFormReturn<any>;
  productType: string;
}

const SealedProductFields = ({ form, productType }: SealedProductFieldsProps) => {
  const showPackCount = ['blister-pack', 'etb', 'box', 'tin'].includes(productType);
  const showSealedOption = productType !== 'card';

  if (productType === 'card') {
    return null;
  }

  return (
    <div className="space-y-4">
      {showSealedOption && (
        <FormField
          control={form.control}
          name="isSealed"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Sealed Product</FormLabel>
                <p className="text-sm text-muted-foreground">
                  Is this product still factory sealed?
                </p>
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
      )}

      {showPackCount && (
        <FormField
          control={form.control}
          name="packCount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {productType === 'blister-pack' && 'Number of Packs'}
                {productType === 'etb' && 'Number of Booster Packs'}
                {productType === 'box' && 'Number of Booster Packs'}
                {productType === 'tin' && 'Number of Packs/Promos'}
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  placeholder="Enter count"
                  {...field}
                  value={field.value || ''}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || '')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <FormField
        control={form.control}
        name="setCode"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Set Code (Optional)</FormLabel>
            <FormControl>
              <Input
                placeholder="e.g., PAL, OBF, MEW"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

export default SealedProductFields;
