
# Supabase Implementation for Card Collection

This document outlines how to implement the card collection system using Supabase in a production environment.

## Database Schema

In Supabase, you would create the following tables:

### 1. `user_cards` Table

```sql
CREATE TABLE user_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  card_id TEXT NOT NULL,
  card_name TEXT NOT NULL,
  card_image TEXT NOT NULL,
  rarity TEXT,
  number TEXT,
  set_id TEXT,
  set_name TEXT,
  condition TEXT,
  estimated_value TEXT,
  quantity INTEGER DEFAULT 1,
  is_graded BOOLEAN DEFAULT FALSE,
  grading_company TEXT,
  grade_score TEXT,
  for_trade BOOLEAN DEFAULT FALSE,
  trade_preferences TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on user_id for faster queries
CREATE INDEX idx_user_cards_user_id ON user_cards(user_id);

-- Add Row Level Security (RLS) policies
ALTER TABLE user_cards ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to only see their own cards
CREATE POLICY "Users can only view their own cards"
  ON user_cards
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy to allow users to only insert their own cards
CREATE POLICY "Users can only insert their own cards"
  ON user_cards
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to only update their own cards
CREATE POLICY "Users can only update their own cards"
  ON user_cards
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy to allow users to only delete their own cards
CREATE POLICY "Users can only delete their own cards"
  ON user_cards
  FOR DELETE
  USING (auth.uid() = user_id);
```

### 2. `user_wishlist` Table (Optional - for wishlist functionality)

```sql
CREATE TABLE user_wishlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  card_id TEXT NOT NULL,
  card_name TEXT NOT NULL,
  card_image TEXT NOT NULL,
  rarity TEXT,
  number TEXT,
  set_id TEXT,
  set_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add appropriate indexes and RLS policies similar to user_cards table
```

## Implementation Steps

1. **Set Up Supabase Authentication**: Enable authentication to identify users
2. **Create Tables**: Create the tables described above
3. **Update Collection Service**: Modify the collection service to use Supabase instead of localStorage

```typescript
// Example of updated addCardToCollection function
export const addCardToCollection = async (
  newCard: ExtendedCardItemProps
): Promise<void> => {
  try {
    const { data: existingCards, error: fetchError } = await supabase
      .from('user_cards')
      .select('id, quantity')
      .eq('user_id', currentUser.id)
      .eq('card_id', newCard.id)
      .eq('condition', newCard.condition || '')
      .eq('is_graded', newCard.graded || false)
      .eq('grading_company', newCard.gradingCompany || '')
      .eq('grade_score', newCard.gradeScore || '');

    if (fetchError) throw fetchError;

    if (existingCards && existingCards.length > 0) {
      // Update quantity if card already exists
      const existingCard = existingCards[0];
      const { error: updateError } = await supabase
        .from('user_cards')
        .update({ 
          quantity: (existingCard.quantity || 1) + (newCard.quantity || 1),
          updated_at: new Date()
        })
        .eq('id', existingCard.id);

      if (updateError) throw updateError;
    } else {
      // Insert new card
      const { error: insertError } = await supabase
        .from('user_cards')
        .insert({
          user_id: currentUser.id,
          card_id: newCard.id,
          card_name: newCard.name,
          card_image: newCard.images?.small || newCard.imageUrl || '',
          rarity: newCard.rarity || '',
          number: newCard.number || '',
          set_id: newCard.set?.id || '',
          set_name: newCard.set?.name || '',
          condition: newCard.condition || '',
          estimated_value: newCard.estimatedValue || '',
          quantity: newCard.quantity || 1,
          is_graded: newCard.graded || false,
          grading_company: newCard.gradingCompany || '',
          grade_score: newCard.gradeScore || '',
          for_trade: newCard.forTrade || false,
          trade_preferences: newCard.tradePreferences || ''
        });

      if (insertError) throw insertError;
    }

    // Invalidate queries to refresh UI
    queryClient.invalidateQueries({ queryKey: ['collection'] });
    
    // Similarly implement getCollection, getTradableCards, etc. to use Supabase
  } catch (error) {
    console.error('Error adding card to collection:', error);
    throw error;
  }
};
```

4. **Implement Real-Time Updates**: Use Supabase's real-time capabilities to sync changes across tabs and devices

```typescript
// In your initialization code
const subscribeToCollectionChanges = (userId: string) => {
  const subscription = supabase
    .channel('public:user_cards')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_cards',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        // Refresh collection data when changes occur
        queryClient.invalidateQueries({ queryKey: ['collection'] });
      }
    )
    .subscribe();
    
  return subscription;
};
```

5. **Migration Tool**: Provide a utility to migrate existing localStorage data to Supabase when a user signs up or logs in:

```typescript
export const migrateLocalStorageToSupabase = async (userId: string) => {
  try {
    // Get collections from localStorage
    const localCollection = safelyParseCollection('myCollection');
    const localTradable = safelyParseCollection('tradableCards');
    const localWishlist = safelyParseCollection('wishlistCards');
    
    // Prepare data for insertion
    const userCards = localCollection.map(card => ({
      user_id: userId,
      card_id: card.id,
      card_name: card.name,
      card_image: card.images?.small || card.imageUrl || '',
      rarity: card.rarity || '',
      number: card.number || '',
      set_id: card.set?.id || '',
      set_name: card.set?.name || '',
      condition: card.condition || '',
      estimated_value: card.estimatedValue || '',
      quantity: card.quantity || 1,
      is_graded: card.graded || false,
      grading_company: card.gradingCompany || '',
      grade_score: card.gradeScore || '',
      for_trade: card.forTrade || false,
      trade_preferences: card.tradePreferences || ''
    }));
    
    // Insert all cards in a single batch
    if (userCards.length > 0) {
      const { error } = await supabase
        .from('user_cards')
        .upsert(userCards, { onConflict: 'user_id, card_id, condition, is_graded, grading_company, grade_score' });
        
      if (error) throw error;
    }
    
    // Similar implementation for wishlist
    
    return true;
  } catch (error) {
    console.error('Error migrating to Supabase:', error);
    return false;
  }
};
```

## Benefits

1. **Data Persistence**: Cards are stored in the database rather than browser storage
2. **Cross-Device Access**: Access your collection on any device
3. **Real-Time Updates**: Changes reflect instantly across all open tabs/devices
4. **Data Security**: Proper authentication and authorization through RLS policies
5. **Rich Queries**: Advanced filtering and sorting capabilities

## Getting Started

1. Create a Supabase project at https://supabase.com
2. Set up the tables with the SQL provided above
3. Integrate the Supabase client in your application
4. Update the collection service to use Supabase functions
