// Real sealed products API service using Perplexity for current data

export interface RealSealedProduct {
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

// Fetch real sealed product data using Perplexity API
export const fetchRealSealedProducts = async (apiKey: string, setName?: string): Promise<RealSealedProduct[]> => {
  const searchQuery = setName 
    ? `Pokemon TCG ${setName} sealed products booster box elite trainer box collection box current prices images 2024`
    : `Pokemon TCG latest sealed products booster boxes elite trainer boxes collection boxes current prices images December 2024`;

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content: `You are a Pokemon TCG product specialist. Return ONLY a valid JSON array of sealed products with this exact structure:
            [
              {
                "id": "unique-id",
                "name": "Product Name",
                "type": "Booster Box|Elite Trainer Box|Collection Box|Tin|Blister Pack",
                "setName": "Set Name",
                "setId": "set-code",
                "price": {
                  "current": 99.99,
                  "currency": "USD",
                  "source": "TCGPlayer|Amazon|Target"
                },
                "imageUrl": "direct-image-url",
                "availability": "in-stock|pre-order|out-of-stock",
                "releaseDate": "2024-MM-DD",
                "description": "Product description",
                "vendor": "Official vendor",
                "retailPrice": 119.99
              }
            ]
            Include real, working image URLs and current market prices. Return 10-15 products maximum.`
          },
          {
            role: 'user',
            content: searchQuery
          }
        ],
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: 2000,
        return_images: false,
        return_related_questions: false,
        search_domain_filter: ['tcgplayer.com', 'pokemoncenter.com', 'amazon.com'],
        search_recency_filter: 'month',
        frequency_penalty: 1,
        presence_penalty: 0
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content received from API');
    }

    // Parse the JSON response
    try {
      const products = JSON.parse(content);
      return Array.isArray(products) ? products : [];
    } catch (parseError) {
      console.error('Failed to parse API response:', content);
      throw new Error('Invalid JSON response from API');
    }

  } catch (error) {
    console.error('Error fetching real sealed products:', error);
    throw error;
  }
};

// Fetch specific product images and validate them
export const validateAndGetProductImage = async (productName: string, apiKey: string): Promise<string | null> => {
  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content: 'Return ONLY a direct, working image URL for the requested Pokemon TCG product. No explanations, just the URL.'
          },
          {
            role: 'user',
            content: `Find a high-quality product image URL for: ${productName}`
          }
        ],
        temperature: 0.1,
        max_tokens: 200,
        search_domain_filter: ['tcgplayer.com', 'pokemoncenter.com', 'amazon.com', 'ebay.com'],
        search_recency_filter: 'month'
      }),
    });

    const data = await response.json();
    const imageUrl = data.choices[0]?.message?.content?.trim();
    
    // Validate the URL
    if (imageUrl && imageUrl.startsWith('http') && (imageUrl.includes('.jpg') || imageUrl.includes('.png') || imageUrl.includes('.webp'))) {
      return imageUrl;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching product image:', error);
    return null;
  }
};

// Get current market prices for sealed products
export const getCurrentMarketPrices = async (productName: string, apiKey: string): Promise<{ price: number; source: string } | null> => {
  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content: 'Return ONLY a JSON object with current price: {"price": 99.99, "source": "TCGPlayer"}. No explanations.'
          },
          {
            role: 'user',
            content: `Current market price for ${productName} Pokemon TCG sealed product`
          }
        ],
        temperature: 0.1,
        max_tokens: 100,
        search_domain_filter: ['tcgplayer.com', 'amazon.com'],
        search_recency_filter: 'week'
      }),
    });

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  } catch (error) {
    console.error('Error fetching current prices:', error);
    return null;
  }
};

export default {
  fetchRealSealedProducts,
  validateAndGetProductImage,
  getCurrentMarketPrices
};