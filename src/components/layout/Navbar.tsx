import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
  Settings,
  Box
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import SocialTradeHub from "@/components/trades/SocialTradeHub";
import NotificationCenter from "@/components/notifications/NotificationCenter";
import { useUser } from "@/hooks/useUser";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Navbar = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile, isSignedIn } = useUser();
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

  const publicNavigationItems = [
    { name: "Home", path: "/", icon: <Home className="mr-2 h-4 w-4" /> },
    { name: "Browse Cards", path: "/pokemons", icon: <Package className="mr-2 h-4 w-4" /> },
    { name: "Browse Sets", path: "/pokemon-sets", icon: <Layers className="mr-2 h-4 w-4" /> },
  ];

  const protectedNavigationItems = [
    { name: "Home", path: "/", icon: <Home className="mr-2 h-4 w-4" /> },
    { name: "My Collection", path: "/collection", icon: <Archive className="mr-2 h-4 w-4" /> },
    { name: "Trades", path: "/trades", icon: <ArrowLeftRight className="mr-2 h-4 w-4" /> },
    { name: "Sets", path: "/pokemon-sets", icon: <Layers className="mr-2 h-4 w-4" /> },
    { name: "Sealed Products", path: "/sealed-products", icon: <Box className="mr-2 h-4 w-4" /> },
    { name: "Marketplace", path: "/marketplace", icon: <ShoppingCart className="mr-2 h-4 w-4" /> },
    { name: "Profile", path: "/profile", icon: <User className="mr-2 h-4 w-4" /> },
  ];

  const navigationItems = isSignedIn ? protectedNavigationItems : publicNavigationItems;

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/');
      toast({
        title: "Signed out successfully",
        description: "You have been signed out of your account.",
      });
    } catch (error: any) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
    }
  };

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
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-card border-b border-white/5 ${
          scrolled ? "shadow-md" : ""
        }`}
      >
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <Package className="h-6 w-6 text-primary" />
              <span className="font-bold text-xl">CollectX</span>
            </Link>
            
            {!isMobile && (
              <nav className="hidden md:flex items-center">
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide max-w-2xl">
                  <NavLinks />
                </div>
              </nav>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isSignedIn ? (
              <>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="relative"
                  onClick={() => setIsSocialHubOpen(true)}
                >
                  <MessageSquare className="h-5 w-5" />
                </Button>

                <NotificationCenter />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={profile?.avatar_url} alt={profile?.display_name || "User"} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {profile?.display_name ? profile.display_name.substring(0, 2).toUpperCase() : user?.email?.substring(0, 2).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 animate-fade-in">
                    <DropdownMenuLabel className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={profile?.avatar_url} alt={profile?.display_name || "User"} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          {profile?.display_name ? profile.display_name.substring(0, 2).toUpperCase() : user?.email?.substring(0, 2).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{profile?.display_name || "User"}</div>
                        <div className="text-xs text-muted-foreground">{user?.email}</div>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/account-settings">
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
                      <Link to="/collection-boxes">
                        <Box className="mr-2 h-4 w-4" />
                        <span>Collection Boxes</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/trades">
                        <ArrowLeftRight className="mr-2 h-4 w-4" />
                        <span>Trades</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/sealed-products">
                        <Box className="mr-2 h-4 w-4" />
                        <span>Sealed Products</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/marketplace">
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        <span>Marketplace</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link to="/auth">Sign In</Link>
                </Button>
                <Button asChild>
                  <Link to="/auth">Sign Up</Link>
                </Button>
              </>
            )}

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
