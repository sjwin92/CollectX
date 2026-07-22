
import React from "react";
import { Link } from "react-router-dom";
import { Package } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-secondary/50 py-8 mt-auto">
      <div className="container">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex flex-col gap-2">
            <Link to="/" className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <span className="font-bold text-lg">CollectX</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Card-for-card trading and collection management for Pokémon collectors.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="font-medium text-sm">Platform</h3>
            <nav className="flex flex-col gap-1">
              <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Home
              </Link>
              <Link to="/collection" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Collection
              </Link>
              <Link to="/trades" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Trades
              </Link>
              <Link to="/pokemon-cards" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Pokémon Cards
              </Link>
              <Link to="/profile" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                My Profile
              </Link>
            </nav>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} CollectX. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
