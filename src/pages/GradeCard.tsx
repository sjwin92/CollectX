import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Info } from "lucide-react";
import CardCaptureStep from "@/components/grading/CardCaptureStep";
import {
  gradeCard,
  getScanQuota,
  createScanCreditCheckout,
  GradeCardError,
  type CardGradeResult,
  type ScanQuota,
} from "@/services/cardGradingService";

type Step = 'front' | 'back' | 'analyzing' | 'result';

const gradeToPct = (grade: number | null) => (grade == null ? 0 : Math.round(grade * 10));

const GradeCard: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('front');
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [result, setResult] = useState<CardGradeResult | null>(null);
  const [quota, setQuota] = useState<ScanQuota | null>(null);
  const [noCredits, setNoCredits] = useState(false);
  const [isBuying, setIsBuying] = useState(false);

  const loadQuota = () => getScanQuota().then(setQuota).catch(() => setQuota(null));

  useEffect(() => {
    loadQuota();
  }, []);

  useEffect(() => {
    const credits = searchParams.get('credits');
    if (credits === 'success') {
      toast({ title: "Credits added", description: "Your scan credits are ready to use." });
      loadQuota();
    } else if (credits === 'cancelled') {
      toast({ title: "Checkout cancelled", description: "No charge was made.", variant: "destructive" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const analyze = async (front: string, back: string | null) => {
    setStep('analyzing');
    setNoCredits(false);
    try {
      const gradeResult = await gradeCard(front, back ?? undefined);
      setResult(gradeResult);
      setStep('result');
      loadQuota();
    } catch (error) {
      if (error instanceof GradeCardError && error.code === 'no_credits') {
        setNoCredits(true);
        setStep('front');
        setFrontImage(null);
        setBackImage(null);
      } else {
        toast({
          title: "Couldn't grade this card",
          description: error instanceof Error ? error.message : "Something went wrong analyzing the photos. Please try again.",
          variant: "destructive",
        });
        setStep('back');
      }
    }
  };

  const handleFrontCaptured = (base64: string) => {
    setFrontImage(base64);
    setStep('back');
  };

  const handleBackCaptured = (base64: string) => {
    setBackImage(base64);
    analyze(frontImage!, base64);
  };

  const handleSkipBack = () => {
    analyze(frontImage!, null);
  };

  const startOver = () => {
    setFrontImage(null);
    setBackImage(null);
    setResult(null);
    setStep('front');
  };

  const handleBuyCredits = async () => {
    setIsBuying(true);
    try {
      const url = await createScanCreditCheckout();
      window.location.href = url;
    } catch (error) {
      setIsBuying(false);
      toast({
        title: "Couldn't start checkout",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const scansLeft = quota ? Math.max(0, quota.freeScanLimit - quota.freeScansUsed) : null;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container max-w-lg space-y-6">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-primary" /> Grade My Card
              </h1>
              <Link to="/my-scans" className="text-sm text-muted-foreground hover:underline shrink-0">My Scans</Link>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              AI pre-grading estimate — centering, corners, edges &amp; surface, mapped to a rough 1–10 scale.
            </p>
            {quota && (
              <p className="text-xs text-muted-foreground mt-2">
                {scansLeft! > 0
                  ? `${scansLeft} free scan${scansLeft === 1 ? '' : 's'} left`
                  : quota.purchasedCredits > 0
                    ? `${quota.purchasedCredits} scan credit${quota.purchasedCredits === 1 ? '' : 's'} left`
                    : 'No scans left'}
              </p>
            )}
          </div>

          {noCredits && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <p className="text-sm">You've used all your free scans. Buy a credit pack to keep going.</p>
                <Button onClick={handleBuyCredits} disabled={isBuying} className="w-full">
                  {isBuying ? "Redirecting..." : "Buy 10 scans — £2.99"}
                </Button>
              </CardContent>
            </Card>
          )}

          {step === 'front' && (
            <Card>
              <CardHeader><CardTitle className="text-base">Step 1 of 2 — Front of card</CardTitle></CardHeader>
              <CardContent>
                <CardCaptureStep label="Front" onCaptured={handleFrontCaptured} />
              </CardContent>
            </Card>
          )}

          {step === 'back' && (
            <Card>
              <CardHeader><CardTitle className="text-base">Step 2 of 2 — Back of card</CardTitle></CardHeader>
              <CardContent>
                <CardCaptureStep label="Back" onCaptured={handleBackCaptured} onSkip={handleSkipBack} />
              </CardContent>
            </Card>
          )}

          {step === 'analyzing' && (
            <Card>
              <CardContent className="p-8 text-center space-y-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                <p className="text-sm text-muted-foreground">Analyzing your card — this takes 10–20 seconds…</p>
              </CardContent>
            </Card>
          )}

          {step === 'result' && result && (
            <div className="space-y-4">
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-5xl font-bold text-primary">
                    {result.overall_grade != null ? result.overall_grade.toFixed(1) : '—'}
                    <span className="text-lg text-muted-foreground">/10</span>
                  </div>
                  <p className="text-lg font-medium mt-1">{result.condition_label ?? 'Unknown condition'}</p>
                  {result.confidence != null && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {Math.round(result.confidence)}% confidence
                      {result.confidence < 60 ? ' — add a back photo or better lighting for a more reliable read' : ''}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Breakdown</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {[
                    ['Centering', result.centering_grade, result.centering_ratio_lr && result.centering_ratio_tb ? `${result.centering_ratio_lr} · ${result.centering_ratio_tb}` : null],
                    ['Corners', result.corners_grade, null],
                    ['Edges', result.edges_grade, null],
                    ['Surface', result.surface_grade, null],
                  ].map(([label, grade, note]) => (
                    <div key={label as string}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{label}</span>
                        <span className="text-muted-foreground">
                          {grade != null ? `${(grade as number).toFixed(1)}/10` : 'N/A'}{note ? ` (${note})` : ''}
                        </span>
                      </div>
                      <Progress value={gradeToPct(grade as number | null)} />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  This is an AI estimate, not an official grade. Different grading companies score the same
                  card differently — a card that lands here as roughly a PSA 9 might come back a BGS 8.5 or
                  9.5 depending on how strictly each corner/surface subgrade is scored. Use this as a rough
                  guide before submitting to a professional grader, not a substitute for one.
                </AlertDescription>
              </Alert>

              <Button variant="outline" onClick={startOver} className="w-full">Grade another card</Button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default GradeCard;
