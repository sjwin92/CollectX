
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/react-query";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { LoadingProvider } from "./contexts/LoadingContext";
import { Toaster } from "@/components/ui/toaster";
import ProtectedRoute from "./components/common/ProtectedRoute";
import Trades from "./pages/Trades";
import Collection from "./pages/Collection";
import CollectionBoxes from "./pages/CollectionBoxes";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import TradeDetail from "./pages/TradeDetail";
import PokemonCards from "./pages/PokemonCards";
import CardDetail from "./pages/CardDetail";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import Pokemons from "./pages/Pokemons";
import Marketplace from "./pages/Marketplace";
import Sets from "./pages/Sets";
import SetDetail from "./pages/SetDetail";
import Products from "./pages/Products";
import SealedProducts from "./pages/SealedProducts";

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <LoadingProvider>
          <BrowserRouter>
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
              
              {/* 404 Page */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          <Toaster />
        </LoadingProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
