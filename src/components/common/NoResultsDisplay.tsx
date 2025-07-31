// Enhanced error display component for better user experience
import React from 'react';
import { AlertTriangle, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getPopularSetIds } from '@/services/setIdMappingService';

interface NoResultsDisplayProps {
  setId?: string | null;
  nameQuery?: string | null;
  onRetry?: () => void;
  onClearFilters?: () => void;
}

export const NoResultsDisplay: React.FC<NoResultsDisplayProps> = ({
  setId,
  nameQuery,
  onRetry,
  onClearFilters
}) => {
  const popularSets = getPopularSetIds();

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="rounded-full bg-muted p-4">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">No Cards Found</h3>
          <p className="text-muted-foreground">
            {setId && nameQuery 
              ? `No cards found for "${nameQuery}" in set "${setId}"`
              : setId 
                ? `No cards found for set "${setId}"`
                : nameQuery 
                  ? `No cards found matching "${nameQuery}"`
                  : "No cards found with current filters"
            }
          </p>
        </div>

        {setId && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              The set ID "{setId}" might not exist or could be in a different format. 
              Try one of the popular sets below or check your spelling.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {onRetry && (
            <Button onClick={onRetry} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          )}
          {onClearFilters && (
            <Button onClick={onClearFilters} variant="default">
              Clear Filters
            </Button>
          )}
        </div>

        {setId && (
          <div className="mt-6">
            <h4 className="text-sm font-medium mb-3">Try these popular sets:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {popularSets.slice(0, 6).map((set) => (
                <Button
                  key={set.id}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    window.location.href = `/pokemon-cards?setId=${set.id}`;
                  }}
                  className="text-xs"
                >
                  {set.name}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};