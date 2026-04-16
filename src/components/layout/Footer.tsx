
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
              The safe trading platform for Pokémon card collectors
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-12">
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
                <Link to="/pokemons" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Pokémon Cards
                </Link>
              </nav>
            </div>
            
            <div className="flex flex-col gap-2">
              <h3 className="font-medium text-sm">Support</h3>
              <nav className="flex flex-col gap-1">
                <Link to="/profile" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  My Profile
                </Link>
                <Link to="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Safety Guide
                </Link>
                <Link to="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Contact Us
                </Link>
              </nav>
            </div>
            
            <div className="flex flex-col gap-2 col-span-2 md:col-span-1">
              <h3 className="font-medium text-sm">Legal</h3>
              <nav className="flex flex-col gap-1">
                <Link to="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Terms of Service
                </Link>
                <Link to="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
                <Link to="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Trading Guidelines
                </Link>
              </nav>
            </div>
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} CollectX. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link to="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link to="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link to="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
