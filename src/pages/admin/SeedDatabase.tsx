import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, SkipForward, Database, Play, RotateCcw } from "lucide-react";

type Phase = "idle" | "sets" | "cards" | "done" | "error";

interface BatchResult {
  setId: string;
  setName: string;
  skipped?: boolean;
  cardCount?: number;
  error?: string;
}

interface LogEntry {
  timestamp: string;
  message: string;
  type: "info" | "success" | "error" | "skip";
}

const BATCH_SIZE = 5;

const SeedDatabase = () => {
  const [phase, setPhase] = useState<Phase>("idle");
  const [totalSets, setTotalSets] = useState(0);
  const [processedSets, setProcessedSets] = useState(0);
  const [totalCards, setTotalCards] = useState(0);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [force, setForce] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const addLog = (message: string, type: LogEntry["type"] = "info") => {
    setLog(prev => [{
      timestamp: new Date().toLocaleTimeString(),
      message,
      type,
    }, ...prev]);
  };

  const invoke = async (body: object) => {
    const { data, error } = await (supabase as any).functions.invoke("seed-database", { body });
    if (error) throw new Error(error.message);
    return data;
  };

  const handleSeed = async () => {
    setIsRunning(true);
    setLog([]);
    setProcessedSets(0);
    setTotalCards(0);
    setTotalSets(0);

    try {
      // Phase 1: import set metadata
      setPhase("sets");
      addLog("Importing set metadata from Pokémon TCG API...");
      const setsResult = await invoke({ phase: "sets", force });

      if (setsResult.skipped) {
        addLog(`Set metadata already fresh (${Math.round(setsResult.ageMs / 60000)}m old) — skipping`, "skip");
      } else {
        addLog(`Imported ${setsResult.count} sets`, "success");
      }

      // Phase 2: import cards in batches
      setPhase("cards");
      let offset = 0;
      let done = false;

      while (!done) {
        addLog(`Importing cards for sets ${offset + 1}–${offset + BATCH_SIZE}...`);
        const result = await invoke({ phase: "cards", offset, limit: BATCH_SIZE, force });

        const { results, total, done: batchDone, summary } = result;

        setTotalSets(total);
        setProcessedSets(offset + (results?.length ?? 0));
        setTotalCards(prev => prev + (summary?.totalCards ?? 0));

        for (const r of (results ?? []) as BatchResult[]) {
          if (r.error) {
            addLog(`${r.setName}: ${r.error}`, "error");
          } else if (r.skipped) {
            addLog(`${r.setName}: already fresh — skipped`, "skip");
          } else {
            addLog(`${r.setName}: imported ${r.cardCount} cards`, "success");
          }
        }

        done = batchDone;
        offset = result.nextOffset;

        // Small delay between batches to be gentle on the TCG API rate limits
        if (!done) await new Promise(r => setTimeout(r, 500));
      }

      setPhase("done");
      addLog(`Seed complete. ${totalSets} sets, ${totalCards} cards imported.`, "success");
    } catch (err) {
      setPhase("error");
      addLog(`Fatal error: ${err instanceof Error ? err.message : String(err)}`, "error");
    } finally {
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    setPhase("idle");
    setLog([]);
    setProcessedSets(0);
    setTotalSets(0);
    setTotalCards(0);
  };

  const progress = totalSets > 0 ? Math.round((processedSets / totalSets) * 100) : 0;

  const logIcon = (type: LogEntry["type"]) => {
    if (type === "success") return <CheckCircle className="h-3 w-3 text-green-500 shrink-0 mt-0.5" />;
    if (type === "error") return <XCircle className="h-3 w-3 text-destructive shrink-0 mt-0.5" />;
    if (type === "skip") return <SkipForward className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />;
    return <div className="h-3 w-3 rounded-full bg-primary/40 shrink-0 mt-0.5" />;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="container py-8 flex-1 max-w-3xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Database className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold">Seed Database</h1>
            <Badge variant="outline">Admin</Badge>
          </div>
          <p className="text-muted-foreground">
            Bulk-imports the complete Pokémon TCG dataset into your local Supabase mirror.
            Run this once to seed, then weekly to stay fresh.
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={force}
                onChange={e => setForce(e.target.checked)}
                disabled={isRunning}
                className="h-4 w-4"
              />
              <div>
                <p className="text-sm font-medium">Force re-import</p>
                <p className="text-xs text-muted-foreground">
                  Re-imports all sets even if they were imported within the last 24 hours.
                  Use for a full refresh; leave unchecked for incremental updates.
                </p>
              </div>
            </label>
          </CardContent>
        </Card>

        {/* Progress */}
        {phase !== "idle" && (
          <Card className="mb-6">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium capitalize">
                  {phase === "sets" && "Importing set metadata…"}
                  {phase === "cards" && `Importing cards (${processedSets} / ${totalSets || "?"} sets)`}
                  {phase === "done" && "Complete"}
                  {phase === "error" && "Failed"}
                </span>
                <span className="text-muted-foreground">
                  {totalCards.toLocaleString()} cards imported
                </span>
              </div>
              {phase === "cards" && totalSets > 0 && (
                <Progress value={progress} className="h-2" />
              )}
              {phase === "done" && (
                <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                  <CheckCircle className="h-4 w-4" />
                  Seed complete — {totalSets} sets, {totalCards.toLocaleString()} cards
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-3 mb-6">
          <Button
            onClick={handleSeed}
            disabled={isRunning}
            className="gap-2"
          >
            <Play className="h-4 w-4" />
            {isRunning ? "Running…" : phase === "idle" ? "Start Seed" : "Restart"}
          </Button>
          {(phase === "done" || phase === "error") && (
            <Button variant="outline" onClick={handleReset} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          )}
        </div>

        {/* Log */}
        {log.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5 max-h-96 overflow-y-auto font-mono text-xs">
                {log.map((entry, i) => (
                  <div key={i} className="flex items-start gap-2">
                    {logIcon(entry.type)}
                    <span className="text-muted-foreground shrink-0">{entry.timestamp}</span>
                    <span className={
                      entry.type === "error" ? "text-destructive" :
                      entry.type === "success" ? "text-green-600" :
                      entry.type === "skip" ? "text-muted-foreground" : ""
                    }>{entry.message}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default SeedDatabase;
