
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/react-query";
import Trades from "./pages/Trades";
import Collection from "./pages/Collection";
import Index from "./pages/Index";
import TradeDetail from "./pages/TradeDetail";
import PokemonCards from "./pages/PokemonCards";
import CardDetail from "./pages/CardDetail";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import Pokemons from "./pages/Pokemons";
import Marketplace from "./pages/Marketplace";
import Sets from "./pages/Sets";
import SetDetail from "./pages/SetDetail";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/trades" element={<Trades />} />
          <Route path="/trades/:id" element={<TradeDetail />} />
          <Route path="/collection" element={<Collection />} />
          <Route path="/pokemon-cards" element={<PokemonCards />} />
          <Route path="/pokemon-sets" element={<Sets />} />
          <Route path="/pokemon-sets/:id" element={<SetDetail />} />
          <Route path="/pokemons" element={<Pokemons />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/card/:id" element={<CardDetail />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
