import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { ScanLine, Info, Trash2, ArrowRight } from "lucide-react";
import CardCaptureStep from "@/components/grading/CardCaptureStep";
import {
  gradeCard,
  getScanQuota,
  createScanCreditCheckout,
  getMyScanHistory,
  getScanImageUrl,
  deleteScan,
  GradeCardError,
  type CardGradeResult,
  type CardGradingScan,
  type ScanQuota,
  type MeasuredCenteringInput,
  type CaptureQualityInput,
} from "@/services/cardGradingService";
import type { StillMeasurement } from "@/lib/grading/scanTypes";

type Step = 'front' | 'back' | 'analyzing' | 'result';

const gradeToPct = (grade: number | null) => (grade == null ? 0 : Math.round(grade * 10));
const fmtGrade = (v: number) => (v % 1 === 0 ? String(v) : v.toFixed(1));
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

// Companies we surface a predicted grade for, in the order collectors expect.
const COMPANIES: { key: keyof NonNullable<CardGradeResult["predicted"]>; label: string }[] = [
  { key: 'psa', label: 'PSA' },
  { key: 'bgs', label: 'Beckett (BGS)' },
  { key: 'cgc', label: 'CGC' },
  { key: 'sgc', label: 'SGC' },
  { key: 'tag', label: 'TAG' },
];

const RecentScans: React.FC<{ reloadKey: number }> = ({ reloadKey }) => {
  const { toast } = useToast();
  const [scans, setScans] = useState<CardGradingScan[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    getMyScanHistory()
      .then(async (rows) => {
        setScans(rows);
        const entries = await Promise.all(
          rows.filter((s) => s.front_image_path).slice(0, 8).map(
            async (s) => [s.id, await getScanImageUrl(s.front_image_path!)] as const,
          ),
        );
        const map: Record<string, string> = {};
        for (const [id, url] of entries) if (url) map[id] = url;
        setThumbs(map);
      })
      .catch(() => setScans([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, [reloadKey]);

  const remove = async (id: string) => {
    try {
      await deleteScan(id);
      setScans((prev) => prev.filter((s) => s.id !== id));
      toast({ title: "Scan deleted" });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Couldn't delete scan",
        description: e instanceof Error ? e.message : "Try again.",
      });
    } finally {
      setConfirmId(null);
    }
  };

  if (loading && scans.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Previous scans</h2>
        {scans.length > 0 && (
          <Link to="/my-scans" className="text-sm text-primary hover:underline shrink-0 inline-flex items-center gap-1">
            Manage all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      {scans.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Your graded cards will show up here so you can look back over them.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {scans.slice(0, 5).map((scan) => (
            <Card key={scan.id}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-10 h-14 rounded bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                  {thumbs[scan.id] ? (
                    <img src={thumbs[scan.id]} alt={scan.card_name ?? "Scanned card"} className="w-full h-full object-cover" />
                  ) : (
                    <ScanLine className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-sm">{scan.card_name || "Untitled card"}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(scan.created_at)}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-bold text-primary leading-none">
                    {scan.overall_grade != null ? scan.overall_grade.toFixed(1) : '—'}
                    <span className="text-xs text-muted-foreground">/10</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{scan.condition_label ?? 'Unknown'}</p>
                </div>
                {confirmId === scan.id ? (
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button size="sm" variant="destructive" className="h-6 px-2 text-xs" onClick={() => remove(scan.id)}>
                      Delete
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setConfirmId(null)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => setConfirmId(scan.id)}
                    aria-label="Delete scan"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

const GradeCard: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('front');
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [frontMeasurement, setFrontMeasurement] = useState<StillMeasurement | null>(null);
  const [result, setResult] = useState<CardGradeResult | null>(null);
  const [quota, setQuota] = useState<ScanQuota | null>(null);
  const [noCredits, setNoCredits] = useState(false);
  const [isBuying, setIsBuying] = useState(false);
  const [scansReloadKey, setScansReloadKey] = useState(0);

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

  const analyze = async (front: string, back: string | null, measurement: StillMeasurement | null) => {
    setStep('analyzing');
    setNoCredits(false);
    try {
      const measuredCentering: MeasuredCenteringInput | null = measurement?.centering
        ? {
            lr: measurement.centering.lr,
            tb: measurement.centering.tb,
            grade: measurement.centering.grade,
            worstOffset: measurement.centering.worstOffset,
          }
        : null;
      const frontQuality: CaptureQualityInput | null = measurement?.quality
        ? {
            glare: measurement.quality.glare,
            sharpness: measurement.quality.sharpness,
            skew: measurement.quality.skew,
            flags: measurement.quality.flags,
          }
        : null;
      const gradeResult = await gradeCard(front, back ?? undefined, { measuredCentering, frontQuality });
      setResult(gradeResult);
      setStep('result');
      loadQuota();
      setScansReloadKey((k) => k + 1);
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

  const handleFrontCaptured = (base64: string, measurement: StillMeasurement | null) => {
    setFrontImage(base64);
    setFrontMeasurement(measurement);
    setStep('back');
  };

  const handleBackCaptured = (base64: string) => {
    setBackImage(base64);
    analyze(frontImage!, base64, frontMeasurement);
  };

  const handleSkipBack = () => {
    analyze(frontImage!, null, frontMeasurement);
  };

  const startOver = () => {
    setFrontImage(null);
    setBackImage(null);
    setFrontMeasurement(null);
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
        <div className="container max-w-lg space-y-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ScanLine className="h-6 w-6 text-primary" /> Grade a card
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              A pre-grading estimate from your camera — centering, corners, edges &amp; surface,
              mapped to a rough 1–10 scale and each major grading company.
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
                  {result.predicted && COMPANIES.some(({ key }) => result.predicted![key] != null) && (
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      {COMPANIES.filter(({ key }) => result.predicted![key] != null).map(({ key, label }) => (
                        <span key={key} className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-semibold">
                          {label} <span className="text-primary">{fmtGrade(result.predicted![key] as number)}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {result.notes && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">{result.notes}</AlertDescription>
                </Alert>
              )}

              <Card>
                <CardHeader><CardTitle className="text-base">Breakdown</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {([
                    ['Centering', result.centering_grade, result.centering_ratio_lr && result.centering_ratio_tb ? `${result.centering_ratio_lr} · ${result.centering_ratio_tb}` : null, result.centering_source === 'measured'],
                    ['Corners', result.corners_grade, null, false],
                    ['Edges', result.edges_grade, null, false],
                    ['Surface', result.surface_grade, null, false],
                  ] as const).map(([label, grade, note, measured]) => (
                    <div key={label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="flex items-center gap-1.5">
                          {label}
                          {measured && (
                            <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                              measured on device
                            </span>
                          )}
                        </span>
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
                  {result.centering_source === 'measured'
                    ? 'Centering is measured from the card geometry in your photo (outer edge vs. inner border, PSA thresholds). Corners, edges and surface are an AI estimate. '
                    : 'This is an AI estimate, not an official grade. '}
                  Different grading companies score the same card differently — treat this as a pre-grade
                  guide before submitting to a professional grader, not a substitute for one.
                </AlertDescription>
              </Alert>

              <Button variant="outline" onClick={startOver} className="w-full">Grade another card</Button>
            </div>
          )}

          <RecentScans reloadKey={scansReloadKey} />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default GradeCard;
