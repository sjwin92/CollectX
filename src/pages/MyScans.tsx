import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import {
  getMyScanHistory,
  getScanImageUrl,
  type CardGradingScan,
} from "@/services/cardGradingService";

const MyScans: React.FC = () => {
  const [scans, setScans] = useState<CardGradingScan[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

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

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container max-w-3xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">My Scans</h1>
              <p className="text-sm text-muted-foreground mt-1">Your card grading history.</p>
            </div>
            <Button asChild size="sm">
              <Link to="/grade"><Sparkles className="mr-2 h-4 w-4" /> Grade a card</Link>
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
                  <Link to="/grade"><Sparkles className="mr-2 h-4 w-4" /> Grade your first card</Link>
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
                        <Sparkles className="h-5 w-5 text-muted-foreground" />
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
                    </div>
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
