import React, { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Upload, Download, CheckCircle2, AlertTriangle, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  parseImportCsv,
  runBulkImport,
  CSV_TEMPLATE,
  type ParsedRow,
  type ImportSummary,
} from "@/services/bulkImportService";
import { getMyStore } from "@/services/storeService";
import { getPriceRules } from "@/services/storeInventoryService";

const StoreImport: React.FC = () => {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [listForSale, setListForSale] = useState(true);
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const { data: store } = useQuery({ queryKey: ["my-store"], queryFn: getMyStore });
  const { data: rules } = useQuery({ queryKey: ["store-price-rules"], queryFn: getPriceRules, enabled: !!store });
  const [target, setTarget] = useState<"inventory" | "collection">("inventory");
  const effectiveTarget = store ? target : "collection";

  const parsed = useMemo(() => (text.trim() ? parseImportCsv(text) : { rows: [] as ParsedRow[], errors: [] }), [text]);

  const priced = parsed.rows.filter((r) => r.price != null).length;

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result ?? ""));
    reader.readAsText(f);
  };

  const run = async () => {
    if (parsed.rows.length === 0) return;
    setRunning(true);
    setSummary(null);
    try {
      const res = await runBulkImport(parsed.rows, {
        listForSale,
        target: effectiveTarget,
        priceRuleId: rules?.find((r) => r.is_default)?.id ?? rules?.[0]?.id ?? null,
      });
      setSummary(res);
      toast({
        title: "Import finished",
        description: `${res.added} ${effectiveTarget === "inventory" ? "in inventory" : "added"}${res.listed ? `, ${res.listed} listed` : ""}${res.errors ? `, ${res.errors} failed` : ""}.`,
      });
    } catch (err) {
      toast({ variant: "destructive", title: "Import failed", description: err instanceof Error ? err.message : "Try again." });
    } finally {
      setRunning(false);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "collectx-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container max-w-2xl">
          <Link to="/store/setup" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Storefront
          </Link>
          <h1 className="font-display text-2xl font-extrabold">Bulk import</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Paste or upload a CSV. Columns: <code className="text-xs">name, set_id, number, condition,
            quantity, cost, price, graded, grade_company, grade, for_trade</code>. Only <b>name</b> is required.
          </p>

          {store && (
            <div className="mt-4 inline-flex rounded-full border border-border bg-secondary p-1 text-xs font-semibold">
              {(["inventory", "collection"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTarget(t)}
                  className={`rounded-full px-3 py-1 transition-colors ${
                    target === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  {t === "inventory" ? "Store inventory" : "My collection"}
                </button>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => fileRef.current?.click()}>
              <Upload className="mr-1.5 h-4 w-4" /> Upload CSV
            </Button>
            <Button variant="ghost" size="sm" className="rounded-full" onClick={downloadTemplate}>
              <Download className="mr-1.5 h-4 w-4" /> Template
            </Button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
          </div>

          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            placeholder="name,set_id,number,condition,quantity,price,graded,grade_company,grade,for_trade&#10;Charizard ex,sv3pt5,199,near_mint,1,220.00,,,,false"
            className="mt-3 font-mono text-xs"
          />

          {parsed.errors.length > 0 && (
            <Alert className="mt-3">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {parsed.errors.slice(0, 5).map((e, i) => (
                  <div key={i}>{e}</div>
                ))}
                {parsed.errors.length > 5 && <div>…and {parsed.errors.length - 5} more.</div>}
              </AlertDescription>
            </Alert>
          )}

          {parsed.rows.length > 0 && !summary && (
            <div className="mt-4 rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm">
                  <b>{parsed.rows.length}</b> card{parsed.rows.length === 1 ? "" : "s"} ready
                  {priced > 0 && <span className="text-muted-foreground"> · {priced} priced</span>}
                  <span className="ml-2 text-xs text-muted-foreground">→ {effectiveTarget === "inventory" ? "store inventory" : "collection"}</span>
                </div>
                {effectiveTarget === "collection" && (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={listForSale}
                      onChange={(e) => setListForSale(e.target.checked)}
                      className="h-4 w-4 accent-primary"
                    />
                    List priced rows for sale
                  </label>
                )}
              </div>
              <div className="mt-3 max-h-56 overflow-y-auto rounded-md border border-border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-secondary text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1.5 text-left">Card</th>
                      <th className="px-2 py-1.5 text-left">Set · #</th>
                      <th className="px-2 py-1.5 text-left">Cond.</th>
                      <th className="px-2 py-1.5 text-right">Qty</th>
                      <th className="px-2 py-1.5 text-right">Cost</th>
                      <th className="px-2 py-1.5 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.rows.slice(0, 200).map((r) => (
                      <tr key={r.line} className="border-t border-border">
                        <td className="px-2 py-1.5">{r.name}{r.graded && <span className="ml-1 text-primary">◆</span>}</td>
                        <td className="px-2 py-1.5 text-muted-foreground">{r.set_id || "—"} {r.number && `· ${r.number}`}</td>
                        <td className="px-2 py-1.5 text-muted-foreground">{r.condition}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{r.quantity}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">{r.cost != null ? `£${r.cost.toFixed(2)}` : "—"}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{r.price != null ? `£${r.price.toFixed(2)}` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button className="mt-3 w-full rounded-full" onClick={run} disabled={running}>
                {running ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing…</> : `Import ${parsed.rows.length} card${parsed.rows.length === 1 ? "" : "s"}`}
              </Button>
            </div>
          )}

          {summary && (
            <div className="mt-4 rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <span className="font-display font-bold">Import finished</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                <span><b>{summary.added}</b> added</span>
                {summary.listed > 0 && <span><b className="text-gold">{summary.listed}</b> listed for sale</span>}
                {summary.errors > 0 && <span className="text-red-400"><b>{summary.errors}</b> failed</span>}
              </div>
              {summary.rows.some((r) => r.message) && (
                <div className="mt-3 max-h-56 overflow-y-auto rounded-md border border-border text-xs">
                  {summary.rows
                    .filter((r) => r.message)
                    .map((r) => (
                      <div key={r.line} className="flex justify-between gap-3 border-b border-border px-2 py-1.5 last:border-0">
                        <span className={r.status === "error" ? "text-red-400" : ""}>{r.name}</span>
                        <span className="text-muted-foreground">{r.message}</span>
                      </div>
                    ))}
                </div>
              )}
              <div className="mt-3 flex gap-2">
                <Button asChild variant="outline" size="sm" className="rounded-full">
                  <Link to={effectiveTarget === "inventory" ? "/store/inventory" : "/collection"}>
                    {effectiveTarget === "inventory" ? "View inventory" : "View collection"}
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" className="rounded-full" onClick={() => { setText(""); setSummary(null); }}>
                  Import more
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default StoreImport;
