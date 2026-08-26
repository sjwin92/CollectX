import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import { refreshUsdToGbpRate } from "./services/currencyService";

refreshUsdToGbpRate();
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/react-query"; // side effect: wires up localStorage persistence
import ErrorBoundary from "./components/common/ErrorBoundary";
import { LoadingProvider } from "./contexts/LoadingContext";
import { AuthProvider } from "./contexts/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import ImagePreloader from "@/components/ui/ImagePreloader";
import ProtectedRoute from "./components/common/ProtectedRoute";
import AdminRoute from "./components/common/AdminRoute";
import NavigationAnalytics from "./components/common/NavigationAnalytics";
import Index from "./pages/Index";

// Lazy-loaded routes — code-split for faster initial load
const Auth = lazy(() => import("./pages/Auth"));
const OAuthConsent = lazy(() => import("./pages/OAuthConsent"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Trades = lazy(() => import("./pages/Trades"));
const TradeDetail = lazy(() => import("./pages/TradeDetail"));
const Orders = lazy(() => import("./pages/Orders"));
const OrderDetail = lazy(() => import("./pages/OrderDetail"));
const SellerOnboardingComplete = lazy(() => import("./pages/SellerOnboardingComplete"));
const SellerStore = lazy(() => import("./pages/SellerStore"));
const Collection = lazy(() => import("./pages/Collection"));
const CollectionBoxes = lazy(() => import("./pages/CollectionBoxes"));
const PokemonCards = lazy(() => import("./pages/PokemonCards"));
const CardDetail = lazy(() => import("./pages/CardDetail"));
const Profile = lazy(() => import("./pages/Profile"));
const AccountSettings = lazy(() => import("./pages/AccountSettings"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Pokemons = lazy(() => import("./pages/Pokemons"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const ListingDetail = lazy(() => import("./pages/ListingDetail"));
const Sets = lazy(() => import("./pages/Sets"));
const SetDetail = lazy(() => import("./pages/SetDetail"));
const Products = lazy(() => import("./pages/Products"));
const GradeCard = lazy(() => import("./pages/GradeCard"));
const MyScans = lazy(() => import("./pages/MyScans"));
const Wishlist = lazy(() => import("./pages/Wishlist"));
const NavMetricsAdmin = lazy(() => import("./pages/admin/NavMetrics"));
const SeedDatabase = lazy(() => import("./pages/admin/SeedDatabase"));
const StoreApplicationsAdmin = lazy(() => import("./pages/admin/StoreApplications"));
const ForStores = lazy(() => import("./pages/ForStores"));
const StoreApply = lazy(() => import("./pages/StoreApply"));
const StoreSetup = lazy(() => import("./pages/StoreSetup"));
const StoreImport = lazy(() => import("./pages/StoreImport"));
const StoreInventory = lazy(() => import("./pages/StoreInventory"));
const StorePublic = lazy(() => import("./pages/StorePublic"));

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
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />


                {/* Public routes */}
                <Route path="/pokemon-sets" element={<Sets />} />
                <Route path="/pokemon-sets/:id" element={<SetDetail />} />
                <Route path="/pokemon-cards" element={<PokemonCards />} />
                <Route path="/card/:id" element={<CardDetail />} />
                <Route path="/pokemons" element={<Pokemons />} />
                <Route path="/products" element={<Products />} />
                <Route path="/for-stores" element={<ForStores />} />
                <Route path="/store/:slug" element={<StorePublic />} />

                {/* Protected routes */}
                <Route path="/trades" element={<ProtectedRoute><Trades /></ProtectedRoute>} />
                <Route path="/trades/:tradeId" element={<ProtectedRoute><TradeDetail /></ProtectedRoute>} />
                <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
                <Route path="/orders/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
                <Route path="/seller/onboarding-complete" element={<ProtectedRoute><SellerOnboardingComplete /></ProtectedRoute>} />
                <Route path="/collection" element={<ProtectedRoute><Collection /></ProtectedRoute>} />
                <Route path="/grade" element={<ProtectedRoute><GradeCard /></ProtectedRoute>} />
                <Route path="/my-scans" element={<ProtectedRoute><MyScans /></ProtectedRoute>} />
                <Route path="/wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
                <Route path="/collection-boxes" element={<ProtectedRoute><CollectionBoxes /></ProtectedRoute>} />
                <Route path="/marketplace" element={<ProtectedRoute><Marketplace /></ProtectedRoute>} />
                <Route path="/listings/:id" element={<ProtectedRoute><ListingDetail /></ProtectedRoute>} />
                <Route path="/store/apply" element={<ProtectedRoute><StoreApply /></ProtectedRoute>} />
                <Route path="/store/setup" element={<ProtectedRoute><StoreSetup /></ProtectedRoute>} />
                <Route path="/store/import" element={<ProtectedRoute><StoreImport /></ProtectedRoute>} />
                <Route path="/store/inventory" element={<ProtectedRoute><StoreInventory /></ProtectedRoute>} />
                <Route path="/sellers/:userId" element={<ProtectedRoute><SellerStore /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/account-settings" element={<ProtectedRoute><AccountSettings /></ProtectedRoute>} />

                {/* Admin routes — role-gated */}
                <Route path="/admin/nav-metrics" element={<AdminRoute><NavMetricsAdmin /></AdminRoute>} />
                <Route path="/admin/seed-database" element={<AdminRoute><SeedDatabase /></AdminRoute>} />
                <Route path="/admin/store-applications" element={<AdminRoute><StoreApplicationsAdmin /></AdminRoute>} />

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
