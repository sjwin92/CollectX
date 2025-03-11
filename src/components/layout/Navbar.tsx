
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/useUser";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import TradingIcon from "@/components/ui/custom/TradingIcon";

const Navbar = () => {
  const { isSignedIn, isLoading } = useUser();
  const { toast } = useToast();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <nav className="border-b">
      <div className="container flex h-16 items-center px-4">
        <Link to="/" className="mr-6 flex items-center space-x-2">
          <div className="h-6 w-6 bg-primary flex items-center justify-center rounded-sm">
            <TradingIcon className="h-4 w-4 text-white" />
          </div>
          <span className="text-xl font-bold">CollectX</span>
        </Link>
        <div className="flex flex-1 items-center space-x-4 md:justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/trades">
              <Button variant="ghost">Trades</Button>
            </Link>
            <Link to="/collection">
              <Button variant="ghost">Collection</Button>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {!isLoading && (
              isSignedIn ? (
                <Button variant="outline" onClick={handleSignOut}>
                  Sign Out
                </Button>
              ) : (
                <Link to="/auth">
                  <Button>Sign In</Button>
                </Link>
              )
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
