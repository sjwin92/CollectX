import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { getSellerStripeStatus, type SellerStripeStatus } from "@/services/supabaseMarketplaceService";

const SellerOnboardingComplete = () => {
  const [status, setStatus] = useState<SellerStripeStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSellerStripeStatus()
      .then(setStatus)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container max-w-md">
          <Card>
            <CardContent className="p-8 text-center space-y-4">
              {loading ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
              ) : status?.onboarding_status === "complete" ? (
                <>
                  <CheckCircle2 className="h-12 w-12 mx-auto text-green-600" />
                  <h1 className="text-xl font-semibold">Payouts connected</h1>
                  <p className="text-muted-foreground">You can now list cards for sale in the marketplace.</p>
                  <Button asChild><Link to="/marketplace">Go to marketplace</Link></Button>
                </>
              ) : status?.onboarding_status === "restricted" ? (
                <>
                  <AlertTriangle className="h-12 w-12 mx-auto text-amber-500" />
                  <h1 className="text-xl font-semibold">Almost there</h1>
                  <p className="text-muted-foreground">Stripe needs a bit more information before payouts can be enabled.</p>
                  <Button asChild variant="outline"><Link to="/profile">Back to profile</Link></Button>
                </>
              ) : (
                <>
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground" />
                  <h1 className="text-xl font-semibold">Setup in progress</h1>
                  <p className="text-muted-foreground">We're still verifying your payout account. This can take a little while.</p>
                  <Button asChild variant="outline"><Link to="/profile">Back to profile</Link></Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SellerOnboardingComplete;
