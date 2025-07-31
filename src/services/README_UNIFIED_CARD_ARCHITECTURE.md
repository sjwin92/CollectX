# Unified Pokemon Card API Architecture

## Overview

This document describes the unified card service architecture that combines Pokemon TCG API with fallback mechanisms and ID mapping for maximum compatibility across the application.

## Architecture Components

### 1. Core Services

#### `unifiedCardService.ts` - Main API Layer
- **Primary Purpose**: Single entry point for all card data operations
- **API Strategy**: Pokemon TCG API as primary source with intelligent fallbacks
- **Features**:
  - Automatic ID format conversion
  - Multiple fallback strategies for failed lookups
  - Consistent response format across all operations
  - Error handling and graceful degradation

#### `cardIdMappingService.ts` - ID Translation Layer
- **Purpose**: Handle different card ID formats between APIs
- **Mappings**: Known card IDs used throughout the application
- **Functions**:
  - `convertTcgdxToPokemonTcg()` - Convert legacy TCGDx IDs
  - `convertPokemonTcgToTcgdx()` - Convert to TCGDx format when needed
  - `parseCardId()` - Extract set and number from any ID format
  - `isValidCardId()` - Validate ID format

### 2. API Integration Strategy

#### Primary: Pokemon TCG API (`pokemonCardsService.ts`)
- **Endpoint**: `https://api.pokemontcg.io/v2`
- **Strengths**: Comprehensive data, reliable, well-maintained
- **Usage**: All new card lookups, search operations, set data

#### Fallback: Image Services
- **TCGDx Assets**: `https://assets.tcgdx.net/` (image fallbacks only)
- **Purpose**: Backup image URLs when primary images fail
- **Implementation**: Part of `cardImageService.ts`

### 3. Data Flow

```
User Request
    ↓
unifiedCardService.ts
    ↓
1. Try original ID with Pokemon TCG API
    ↓
2. Convert ID format if needed
    ↓
3. Try alternative ID formats
    ↓
4. Return unified response or null
```

### 4. Migration Completed

#### Removed Dependencies
- ❌ **tcgdexApi.ts** - Deleted (direct API calls removed)
- ❌ **TCGDx API calls** - All converted to unified service

#### Updated Files
- ✅ **tradeService.ts** - Now uses `unifiedCardService`
- ✅ **Collection.tsx** - Uses `searchCardsByName` from unified service
- ✅ **All card operations** - Routed through unified service

## Benefits

### 1. Reliability
- **Fallback Strategy**: Multiple attempts with different ID formats
- **Error Handling**: Graceful degradation when APIs fail
- **Consistent Interface**: Same response format regardless of data source

### 2. Maintainability  
- **Single Entry Point**: All card operations go through unified service
- **ID Mapping**: Centralized handling of different ID formats
- **Future-Proof**: Easy to add new APIs or modify existing ones

### 3. Performance
- **Caching**: Built on existing Pokemon TCG API caching
- **Efficient Fallbacks**: Only try alternatives when primary fails
- **Batch Operations**: Support for multiple card lookups

## Usage Examples

### Get Single Card
```typescript
import { getCardById } from '@/services/unifiedCardService';

// Works with any ID format
const card = await getCardById('sv1-1');       // Pokemon TCG format
const card2 = await getCardById('base2-2');    // Legacy format
```

### Search Cards
```typescript
import { searchCardsByName } from '@/services/unifiedCardService';

const cards = await searchCardsByName('Charizard');
// Returns: UnifiedCard[] with consistent format
```

### Map to Trade Card
```typescript
import { mapToTradeCard } from '@/services/unifiedCardService';

const tradeCard = mapToTradeCard(unifiedCard);
// Returns: TradeCard with standardized properties
```

## Error Handling

The unified service handles errors gracefully:
- **Invalid IDs**: Returns null instead of throwing
- **API Failures**: Tries alternative formats before giving up
- **Network Issues**: Logs errors and returns empty responses
- **Missing Cards**: Clear logging for debugging

## Future Enhancements

### Planned Features
1. **Caching Layer**: Add Redis/local caching for frequently accessed cards
2. **Analytics**: Track which ID formats and APIs are most successful
3. **Admin Dashboard**: Monitor API health and fallback usage
4. **Batch Optimization**: Improve performance for multiple card requests

### Adding New APIs
To add a new card API:
1. Create service file in `src/services/api/`
2. Add ID mapping functions to `cardIdMappingService.ts`
3. Update `unifiedCardService.ts` to include new fallback
4. Test with existing card IDs

## Testing

### Known Working IDs
The system includes mappings for these tested card IDs:
- `sm12-150` - Charizard GX RR
- `sv1-1` - Venusaur V  
- `swsh4-44` - Pikachu VMAX
- `xy8-52` - Mewtwo EX
- `swsh35-22` - Blastoise VMAX
- `base2-2` - Blastoise Holo

### Validation
All card operations now go through the unified service, ensuring:
- ✅ No more 404 errors from missing TCGDx cards
- ✅ Consistent data format across the application
- ✅ Proper error handling and fallbacks
- ✅ Maintainable and scalable architecture