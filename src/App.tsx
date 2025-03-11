
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/react-query";
import { Toaster } from "@/components/ui/toaster";
import Index from "@/pages/Index";
import PokemonSets from "@/pages/PokemonSets";
import PokemonSetDetails from "@/pages/PokemonSetDetails";
import PokemonCards from "@/pages/PokemonCards";
import CardDetail from "@/pages/CardDetail";
import Collection from "@/pages/Collection";
import Profile from "@/pages/Profile";
import Marketplace from "@/pages/Marketplace";
import Trades from "@/pages/Trades";
import TradeDetail from "@/pages/TradeDetail";
import Auth from "@/pages/Auth";
import NotFound from "@/pages/NotFound";

// Scroll to top when route changes
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/pokemon-sets" element={<PokemonSets />} />
          <Route path="/pokemon-cards" element={<PokemonSetDetails />} />
          <Route path="/cards" element={<PokemonCards />} />
          <Route path="/card/:id" element={<CardDetail />} />
          <Route path="/collection" element={<Collection />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/trades" element={<Trades />} />
          <Route path="/trades/:id" element={<TradeDetail />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
