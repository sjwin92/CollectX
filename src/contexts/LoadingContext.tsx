import React, { createContext, useContext, useState, ReactNode } from 'react';

interface LoadingState {
  [key: string]: boolean;
}

interface LoadingContextType {
  loadingStates: LoadingState;
  setLoading: (key: string, isLoading: boolean) => void;
  isLoading: (key: string) => boolean;
  isAnyLoading: () => boolean;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const LoadingProvider = ({ children }: { children: ReactNode }) => {
  const [loadingStates, setLoadingStates] = useState<LoadingState>({});

  const setLoading = (key: string, isLoading: boolean) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: isLoading
    }));
  };

  const isLoading = (key: string) => Boolean(loadingStates[key]);
  
  const isAnyLoading = () => Object.values(loadingStates).some(Boolean);

  return (
    <LoadingContext.Provider value={{ loadingStates, setLoading, isLoading, isAnyLoading }}>
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

// Higher-order component for automatic loading state management
export const withLoading = <P extends object>(
  Component: React.ComponentType<P>,
  loadingKey: string
) => {
  return (props: P) => {
    const { setLoading } = useLoading();
    
    React.useEffect(() => {
      setLoading(loadingKey, true);
      return () => setLoading(loadingKey, false);
    }, [setLoading]);

    return <Component {...props} />;
  };
};