import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  listStoreApplications,
  reviewStoreApplication,
  type StoreApplication,
  type ApplicationStatus,
} from "@/services/storeService";

const TABS: { key: "open" | ApplicationStatus; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "submitted", label: "Submitted" },
  { key: "needs_info", label: "Needs info" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

const StoreApplicationsAdmin: React.FC = () => {
  const { toast } = useToast();
  const [tab, setTab] = useState<"open" | ApplicationStatus>("open");

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-store-applications"],
    queryFn: () => listStoreApplications(),
  });

  const rows = data.filter((a) =>
    tab === "open" ? a.status === "submitted" || a.status === "needs_info" : a.status === tab,
  );

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container max-w-3xl">
          <h1 className="font-display text-2xl font-extrabold">Store applications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Approving grants the store role, creates a pending storefront, and sets the seller
            commission override.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {TABS.map((t) => {
              const n =
                t.key === "open"
                  ? data.filter((a) => a.status === "submitted" || a.status === "needs_info").length
                  : data.filter((a) => a.status === t.key).length;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    tab === t.key
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label} {n > 0 && <span className="ml-1 opacity-70">{n}</span>}
                </button>
              );
            })}
          </div>

          {isLoading ? (
            <div className="mt-10 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <p className="mt-10 text-center text-sm text-muted-foreground">Nothing here.</p>
          ) : (
            <div className="mt-5 space-y-3">
              {rows.map((a) => (
                <Row key={a.id} app={a} onDone={() => { refetch(); toast({ title: "Application updated" }); }} />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

const Row = ({ app, onDone }: { app: StoreApplication; onDone: () => void }) => {
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [commissionPct, setCommissionPct] = useState("3");
  const [note, setNote] = useState("");

  const act = async (decision: "approved" | "rejected" | "needs_info") => {
    setBusy(decision);
    try {
      await reviewStoreApplication({
        applicationId: app.id,
        decision,
        note: note.trim() || undefined,
        commissionBps: decision === "approved" ? Math.round(parseFloat(commissionPct || "8") * 100) : undefined,
      });
      onDone();
    } catch (err) {
      toast({ variant: "destructive", title: "Failed", description: err instanceof Error ? err.message : "Try again." });
    } finally {
      setBusy(null);
    }
  };

  const open = app.status === "submitted" || app.status === "needs_info";

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-display font-bold">{app.business_name}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {app.country} · {app.volume_estimate || "volume n/a"} ·{" "}
            {new Date(app.created_at).toLocaleDateString("en-GB")}
            {app.registration_no && <> · reg {app.registration_no}</>}
          </div>
          {app.website && (
            <a
              href={app.website}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              {app.website.replace(/^https?:\/\//, "")} <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] font-semibold capitalize text-muted-foreground">
          {app.status.replace("_", " ")}
        </span>
      </div>

      {app.message && (
        <p className="mt-2 rounded-md bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">{app.message}</p>
      )}
      {app.review_note && (
        <p className="mt-2 text-xs text-muted-foreground">Last note: {app.review_note}</p>
      )}

      {open && (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note to the applicant (optional)"
            className="h-9 text-sm"
          />
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Commission
              <Input
                value={commissionPct}
                onChange={(e) => setCommissionPct(e.target.value)}
                className="h-8 w-16 text-sm"
              />
              %
            </div>
            <Button size="sm" className="rounded-full" onClick={() => act("approved")} disabled={!!busy}>
              {busy === "approved" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Approve"}
            </Button>
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => act("needs_info")} disabled={!!busy}>
              Ask for info
            </Button>
            <Button size="sm" variant="ghost" className="rounded-full text-red-400" onClick={() => act("rejected")} disabled={!!busy}>
              Reject
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreApplicationsAdmin;
