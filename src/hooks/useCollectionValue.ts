import { useMemo } from "react";
import { useCardPrices } from "@/hooks/useCardPrices";
import { valueCollection, type CollectionValue, type ValuedCard } from "@/lib/collectionValue";
import type { ExtendedCardItemProps } from "@/types/cardTypes";

/**
 * Live portfolio value for a collection: base = TCGplayer market price (GBP),
 * with a grading premium on graded cards and a condition discount on raw ones.
 * Sealed products fall back to their stored value.
 */
export function useCollectionValue(collection: ExtendedCardItemProps[]): CollectionValue {
  const ids = useMemo(
    () => collection.filter((c) => !c.isSealed).map((c) => c.id),
    [collection],
  );
  const prices = useCardPrices(ids);

  return useMemo(() => {
    const valued: ValuedCard[] = collection.map((c) => ({
      id: c.id,
      quantity: c.quantity,
      graded: c.graded,
      gradingCompany: c.gradingCompany,
      gradeScore: c.gradeScore,
      condition: c.condition,
      rarity: c.rarity,
      isSealed: c.isSealed,
      estimatedValue: c.estimatedValue,
    }));
    return valueCollection(valued, (id) => prices.get(id));
  }, [collection, prices]);
}
