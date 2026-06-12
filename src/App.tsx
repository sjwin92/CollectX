import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import { refreshUsdToGbpRate } from "./services/currencyService";

refreshUsdToGbpRate();
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/react-query";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { LoadingProvider } from "./contexts/LoadingContext";
import { AuthProvider } from "./contexts/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import ImagePreloader from "@/components/ui/ImagePreloader";
import ProtectedRoute from "./components/common/ProtectedRoute";
import NavigationAnalytics from "./components/common/NavigationAnalytics";
import Index from "./pages/Index";

// Lazy-loaded routes — code-split for faster initial load
const Auth = lazy(() => import("./pages/Auth"));
const Trades = lazy(() => import("./pages/Trades"));
const TradeDetail = lazy(() => import("./pages/TradeDetail"));
const Collection = lazy(() => import("./pages/Collection"));
const CollectionBoxes = lazy(() => import("./pages/CollectionBoxes"));
const PokemonCards = lazy(() => import("./pages/PokemonCards"));
const CardDetail = lazy(() => import("./pages/CardDetail"));
const Profile = lazy(() => import("./pages/Profile"));
const AccountSettings = lazy(() => import("./pages/AccountSettings"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Pokemons = lazy(() => import("./pages/Pokemons"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const Sets = lazy(() => import("./pages/Sets"));
const SetDetail = lazy(() => import("./pages/SetDetail"));
const Products = lazy(() => import("./pages/Products"));
const SealedProducts = lazy(() => import("./pages/SealedProducts"));
const NavMetricsAdmin = lazy(() => import("./pages/admin/NavMetrics"));

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LoadingProvider>
            <ImagePreloader />
            <BrowserRouter>
            <NavigationAnalytics />
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />

                {/* Public routes */}
                <Route path="/pokemon-sets" element={<Sets />} />
                <Route path="/pokemon-sets/:id" element={<SetDetail />} />
                <Route path="/pokemon-cards" element={<PokemonCards />} />
                <Route path="/card/:id" element={<CardDetail />} />
                <Route path="/pokemons" element={<Pokemons />} />
                <Route path="/products" element={<Products />} />
                <Route path="/sealed-products" element={<SealedProducts />} />

                {/* Protected routes */}
                <Route path="/trades" element={<ProtectedRoute><Trades /></ProtectedRoute>} />
                <Route path="/trades/:id" element={<ProtectedRoute><TradeDetail /></ProtectedRoute>} />
                <Route path="/collection" element={<ProtectedRoute><Collection /></ProtectedRoute>} />
                <Route path="/collection-boxes" element={<ProtectedRoute><CollectionBoxes /></ProtectedRoute>} />
                <Route path="/marketplace" element={<ProtectedRoute><Marketplace /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/account-settings" element={<ProtectedRoute><AccountSettings /></ProtectedRoute>} />
                <Route path="/admin/nav-metrics" element={<ProtectedRoute><NavMetricsAdmin /></ProtectedRoute>} />

                {/* 404 Page */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
            <Toaster />
          </LoadingProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
