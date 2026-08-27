import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScanLine, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getMyScanHistory,
  getScanImageUrl,
  deleteScan,
  type CardGradingScan,
} from "@/services/cardGradingService";

const MyScans: React.FC = () => {
  const { toast } = useToast();
  const [scans, setScans] = useState<CardGradingScan[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    getMyScanHistory()
      .then(async (rows) => {
        setScans(rows);
        const entries = await Promise.all(
          rows
            .filter((s) => s.front_image_path)
            .map(async (s) => [s.id, await getScanImageUrl(s.front_image_path!)] as const)
        );
        const map: Record<string, string> = {};
        for (const [id, url] of entries) if (url) map[id] = url;
        setThumbnails(map);
      })
      .finally(() => setIsLoading(false));
  }, []);

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

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container max-w-3xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">My Scans</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Your card grading history — review past grades or clear out ones you don't need.
              </p>
            </div>
            <Button asChild size="sm">
              <Link to="/grade"><ScanLine className="mr-2 h-4 w-4" /> Grade a card</Link>
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            </div>
          ) : scans.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center space-y-3">
                <p className="text-muted-foreground">You haven't graded any cards yet.</p>
                <Button asChild>
                  <Link to="/grade"><ScanLine className="mr-2 h-4 w-4" /> Grade your first card</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {scans.map((scan) => (
                <Card key={scan.id}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-14 h-20 rounded bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                      {thumbnails[scan.id] ? (
                        <img src={thumbnails[scan.id]} alt={scan.card_name ?? "Scanned card"} className="w-full h-full object-cover" />
                      ) : (
                        <ScanLine className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{scan.card_name || "Untitled card"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(scan.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xl font-bold text-primary">
                        {scan.overall_grade != null ? scan.overall_grade.toFixed(1) : '—'}
                        <span className="text-xs text-muted-foreground">/10</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{scan.condition_label ?? 'Unknown'}</p>
                      {scan.confidence != null && (
                        <p className="text-xs text-muted-foreground">{Math.round(scan.confidence)}% confidence</p>
                      )}
                    </div>
                    {confirmId === scan.id ? (
                      <div className="flex flex-col gap-1 shrink-0">
                        <Button size="sm" variant="destructive" className="h-7 px-2 text-xs" onClick={() => remove(scan.id)}>
                          Delete
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setConfirmId(null)}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
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
      </main>
      <Footer />
    </div>
  );
};

export default MyScans;
