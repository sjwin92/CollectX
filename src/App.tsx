
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import Trades from "./pages/Trades";
import Collection from "./pages/Collection";
import Index from "./pages/Index";
import TradeDetail from "./pages/TradeDetail";
import PokemonCards from "./pages/PokemonCards";
import CardDetail from "./pages/CardDetail";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/trades" element={<Trades />} />
        <Route path="/trades/:id" element={<TradeDetail />} />
        <Route path="/collection" element={<Collection />} />
        <Route path="/pokemon-cards" element={<PokemonCards />} />
        <Route path="/card/:id" element={<CardDetail />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
