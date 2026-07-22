// Shared type for sealed-product display components. The fake generator that
// used to live here (Math.random() pricing/availability presented as real
// market data) has been removed — real sealed-product data comes from
// ebayRealSealedProductsService.ts instead.
export interface FreeSealedProduct {
  id: string;
  name: string;
  type: string;
  setName: string;
  setId: string;
  price: {
    current: number;
    currency: string;
    source: string;
  };
  imageUrl: string;
  availability: 'in-stock' | 'pre-order' | 'out-of-stock';
  releaseDate: string;
  description: string;
  vendor: string;
  retailPrice?: number;
}
