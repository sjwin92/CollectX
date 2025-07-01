import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger 
} from "@/components/ui/sheet";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Menu, 
  User, 
  Package, 
  ArrowLeftRight, 
  LogOut,
  MessageSquare,
  ShoppingCart,
  Layers,
  Archive,
  Home,
  Camera,
  Settings
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import SocialTradeHub from "@/components/trades/SocialTradeHub";

const Navbar = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [scrolled, setScrolled] = useState(false);
  const [isSocialHubOpen, setIsSocialHubOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [scrolled]);

  const navigationItems = [
    { name: "Home", path: "/", icon: <Home className="mr-2 h-4 w-4" /> },
    { name: "My Collection", path: "/collection", icon: <Archive className="mr-2 h-4 w-4" /> },
    { name: "Trades", path: "/trades", icon: <ArrowLeftRight className="mr-2 h-4 w-4" /> },
    { name: "Sets", path: "/pokemon-sets", icon: <Layers className="mr-2 h-4 w-4" /> },
    { name: "Marketplace", path: "/marketplace", icon: <ShoppingCart className="mr-2 h-4 w-4" /> },
    { name: "Profile", path: "/profile", icon: <User className="mr-2 h-4 w-4" /> },
  ];

  const NavLinks = () => (
    <>
      {navigationItems.map((item) => (
        <Link key={item.path} to={item.path}>
          <Button
            variant={location.pathname === item.path ? "default" : "ghost"}
            className="transition-all duration-300"
          >
            {item.icon && item.icon}
            {item.name}
          </Button>
        </Link>
      ))}
    </>
  );

  return (
    <>
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-background/80 backdrop-blur-md shadow-sm" : "bg-transparent"
        }`}
      >
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <Package className="h-6 w-6 text-primary" />
              <span className="font-bold text-xl">CollectX</span>
            </Link>
            
            {!isMobile && (
              <nav className="hidden md:flex items-center gap-1">
                <NavLinks />
              </nav>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative"
              onClick={() => setIsSocialHubOpen(true)}
            >
              <MessageSquare className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-white">
                3
              </span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?ixlib=rb-4.0.3&auto=format&fit=crop&w=256&h=256&q=80" alt="Pokémon Trainer" />
                    <AvatarFallback className="bg-primary text-primary-foreground">PT</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 animate-fade-in">
                <DropdownMenuLabel className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src="https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?ixlib=rb-4.0.3&auto=format&fit=crop&w=256&h=256&q=80" alt="Pokémon Trainer" />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">PT</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">PokéTrader</div>
                    <div className="text-xs text-muted-foreground">trainer@collectx.com</div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Camera className="mr-2 h-4 w-4" />
                  <span>Update Profile Picture</span>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/profile">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Account Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/collection">
                    <Archive className="mr-2 h-4 w-4" />
                    <span>My Collection</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/trades">
                    <ArrowLeftRight className="mr-2 h-4 w-4" />
                    <span>Trades</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/marketplace">
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    <span>Marketplace</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {isMobile && (
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="flex flex-col">
                  <nav className="flex flex-col gap-2 pt-8">
                    <NavLinks />
                  </nav>
                </SheetContent>
              </Sheet>
            )}
          </div>
        </div>
      </header>

      <SocialTradeHub 
        isOpen={isSocialHubOpen} 
        onClose={() => setIsSocialHubOpen(false)} 
      />
    </>
  );
};

export default Navbar;
