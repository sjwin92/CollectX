import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, Clock, Info, XCircle, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { submitStoreApplication, getMyStoreApplication } from "@/services/storeService";

const VOLUMES = [
  { value: "<50/mo", label: "Under 50 sales / month" },
  { value: "50-500", label: "50 – 500 sales / month" },
  { value: "500+", label: "500+ sales / month" },
];

const StoreApply: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    business_name: "",
    registration_no: "",
    country: "United Kingdom",
    website: "",
    volume_estimate: "50-500",
    message: "",
  });

  const { data: existing, isLoading, refetch } = useQuery({
    queryKey: ["my-store-application"],
    queryFn: getMyStoreApplication,
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.business_name.trim() || !form.country.trim()) {
      toast({ variant: "destructive", title: "Missing details", description: "Business name and country are required." });
      return;
    }
    setSubmitting(true);
    try {
      await submitStoreApplication(form);
      toast({ title: "Application submitted", description: "We'll review it within a couple of days." });
      refetch();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Couldn't submit",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openState = existing && ["submitted", "approved", "rejected", "needs_info"].includes(existing.status);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container max-w-lg">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">CollectX for Business</p>
          <h1 className="mt-1 font-display text-2xl font-extrabold">Apply for a store account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Verified stores get a branded storefront, a lower selling fee, and their listings in
            front of collectors who've told us what they're hunting.{" "}
            <Link to="/for-stores" className="text-primary hover:underline">What you get</Link>.
          </p>

          {isLoading ? (
            <div className="mt-8 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : openState ? (
            <StatusCard status={existing!.status} note={existing!.review_note} onEdit={() => refetch()} navigate={navigate} />
          ) : (
            <form onSubmit={submit} className="mt-8 space-y-4">
              <Field label="Business / store name" required>
                <Input value={form.business_name} onChange={set("business_name")} placeholder="Card Kingdom Ltd" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Country" required>
                  <Input value={form.country} onChange={set("country")} />
                </Field>
                <Field label="Company no. / resale cert" hint="optional">
                  <Input value={form.registration_no} onChange={set("registration_no")} placeholder="12345678" />
                </Field>
              </div>
              <Field label="Website or shop link" hint="optional">
                <Input value={form.website} onChange={set("website")} placeholder="https://" />
              </Field>
              <Field label="Roughly how much do you sell?">
                <select
                  value={form.volume_estimate}
                  onChange={(e) => setForm((f) => ({ ...f, volume_estimate: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {VOLUMES.map((v) => (
                    <option key={v.value} value={v.value}>{v.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Anything else?" hint="optional">
                <Textarea
                  value={form.message}
                  onChange={set("message")}
                  rows={3}
                  placeholder="What you sell, where you're based, why CollectX…"
                />
              </Field>
              <Button type="submit" className="w-full rounded-full" disabled={submitting}>
                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</> : "Submit application"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Reviewed by hand. We may ask for proof of business before approving.
              </p>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

const Field = ({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) => (
  <div className="space-y-1.5">
    <Label className="text-sm">
      {label}
      {required && <span className="ml-0.5 text-primary">*</span>}
      {hint && <span className="ml-1.5 text-xs font-normal text-muted-foreground">({hint})</span>}
    </Label>
    {children}
  </div>
);

const StatusCard = ({
  status,
  note,
  navigate,
}: {
  status: string;
  note: string | null;
  onEdit: () => void;
  navigate: ReturnType<typeof useNavigate>;
}) => {
  const map: Record<string, { icon: React.ElementType; tone: string; title: string; body: string }> = {
    submitted: {
      icon: Clock,
      tone: "text-primary",
      title: "Application under review",
      body: "Thanks — we'll come back to you within a couple of days. You'll get a notification either way.",
    },
    needs_info: {
      icon: Info,
      tone: "text-amber-400",
      title: "We need a bit more information",
      body: note || "Check the note we sent and reply, or re-submit with more detail.",
    },
    approved: {
      icon: CheckCircle2,
      tone: "text-emerald-400",
      title: "You're approved",
      body: "Set up your storefront to start listing.",
    },
    rejected: {
      icon: XCircle,
      tone: "text-red-400",
      title: "Not approved this time",
      body: note || "If your situation changes, you're welcome to apply again.",
    },
  };
  const s = map[status] ?? map.submitted;
  return (
    <div className="mt-8 rounded-2xl border border-border bg-card p-6">
      <s.icon className={`h-8 w-8 ${s.tone}`} />
      <h2 className="mt-3 font-display text-lg font-extrabold">{s.title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
      {status === "approved" && (
        <Button className="mt-4 rounded-full" onClick={() => navigate("/store/setup")}>
          Set up your storefront <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export default StoreApply;
