
# Supabase Integration for Featured Cards

This document outlines how the `featuredCardsService.ts` would integrate with Supabase in a production environment.

## Database Schema

In Supabase, we would create a `featured_cards` table with the following schema:

```sql
CREATE TABLE featured_cards (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  rarity TEXT,
  condition TEXT,
  estimated_value TEXT,
  popularity INTEGER DEFAULT 0,
  is_hot BOOLEAN DEFAULT FALSE,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## API Integration

1. **Data Population**: A scheduled Supabase Edge Function would run daily to fetch trending cards from the Pokemon TCG API and update the `featured_cards` table.

2. **Popularity Tracking**: Each time a card is viewed, traded, or searched, we'd increment its popularity metric:

```typescript
// Example Supabase function to track card popularity
export async function trackCardPopularity(
  cardId: string, 
  action: 'view' | 'trade' | 'search'
) {
  const { data, error } = await supabase
    .from('featured_cards')
    .update({ 
      popularity: supabase.raw('popularity + 1'),
      is_hot: supabase.raw('popularity > 50')
    })
    .eq('id', cardId)
    .select();
    
  if (error) throw error;
  return data;
}
```

3. **API Endpoints**: Create Supabase Edge Functions for these operations:

- `GET /api/featured-cards` - Get all featured cards
- `GET /api/featured-cards/:id` - Get a specific featured card
- `POST /api/featured-cards/track` - Track popularity metrics

## Front-End Integration

The front-end would use the Supabase client to interact with these endpoints:

```typescript
// Example of how front-end would call Supabase
import { supabase } from '@/lib/supabase';

export const getFeaturedCards = async (): Promise<FeaturedCard[]> => {
  const { data, error } = await supabase
    .from('featured_cards')
    .select('*')
    .order('popularity', { ascending: false });
    
  if (error) throw error;
  return data;
};
```

## Deployment Process

1. Create the Supabase table structure
2. Deploy Edge Functions for API endpoints
3. Set up a scheduler for the daily update job
4. Configure RLS policies to allow public read access but restricted write access

This architecture allows for a scalable, performant featured cards system with real-time updates based on user behavior.
