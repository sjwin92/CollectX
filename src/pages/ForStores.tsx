import React from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Store, TrendingDown, Users, Repeat, ShieldCheck, ArrowRight } from "lucide-react";

const points = [
  {
    icon: TrendingDown,
    title: "Keep more of every sale",
    body: "A founder-rate 3% seller commission while we onboard the first stores, then 8% — well under the ~13% you lose on eBay. Buyers still just pay a 5% protection fee on top.",
  },
  {
    icon: Users,
    title: "Sell to collectors who've told us what they want",
    body: "Every CollectX user manages a live collection and a want-list. Your inventory lands in front of people actively hunting specific cards — not tyre-kickers.",
  },
  {
    icon: Repeat,
    title: "Buy singles back, in the same app",
    body: "Post what you'll pay and our want-list engine surfaces your offer on a collector's own portfolio. One tap and the card's on its way to you.",
  },
  {
    icon: ShieldCheck,
    title: "Escrow, payouts and grading handled",
    body: "Stripe Connect payouts, held-until-delivery protection, and an AI pre-grade on every card are already built. You list; we run the rails.",
  },
];

const ForStores: React.FC = () => {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border">
          <div className="aura pointer-events-none absolute inset-x-0 -top-24 mx-auto h-[420px] max-w-5xl" aria-hidden />
          <div className="container relative pb-16 pt-28 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              <Store className="h-3.5 w-3.5" /> CollectX for Business
            </span>
            <h1 className="mx-auto mt-5 max-w-3xl font-display text-4xl font-extrabold leading-[1.05] sm:text-5xl">
              Sell your inventory to collectors who are already hunting it.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
              A verified store account on CollectX: list once, price to market, and reach a
              collector audience that manages their collection here every day.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="rounded-full px-6">
                <Link to="/store/apply">
                  Apply for a store account <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full px-6">
                <Link to="/marketplace">See the marketplace</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Value props */}
        <section className="container py-16">
          <div className="grid gap-6 md:grid-cols-2">
            {points.map((p) => (
              <div key={p.title} className="rounded-2xl border border-border bg-card p-6 hover-lift">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-secondary text-primary">
                  <p.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-extrabold">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Economics strip */}
        <section className="border-y border-border bg-secondary/30">
          <div className="container py-14">
            <h2 className="text-center font-display text-2xl font-extrabold">What a £100 sale looks like</h2>
            <div className="mx-auto mt-8 max-w-md overflow-hidden rounded-2xl border border-border">
              {[
                ["Buyer pays (item + 5% protection)", "£105.00", false],
                ["You receive (item − 8% commission)", "£92.00", false],
                ["On eBay you'd net roughly", "£87.00", false],
                ["Your upside per £100 sold", "+£5.00", true],
              ].map(([k, v, gold]) => (
                <div
                  key={k as string}
                  className={`flex items-baseline justify-between gap-4 border-b border-border px-5 py-3.5 last:border-0 ${
                    gold ? "bg-gold/10" : "bg-card"
                  }`}
                >
                  <span className={gold ? "text-sm font-medium" : "text-sm text-muted-foreground"}>{k}</span>
                  <span className={`font-display font-extrabold tabular-nums ${gold ? "text-gold" : ""}`}>{v}</span>
                </div>
              ))}
            </div>
            <p className="mx-auto mt-4 max-w-md text-center text-xs text-muted-foreground">
              Rates are starting positions and set per account. Grading scans and repricing tools
              are included while we build out the store toolkit.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="container py-16 text-center">
          <h2 className="font-display text-2xl font-extrabold">Ready to list?</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Applications are reviewed by hand — business details and a resale certificate or company
            number. We'll get back to you within a couple of days.
          </p>
          <Button asChild size="lg" className="mt-6 rounded-full px-6">
            <Link to="/store/apply">
              Apply now <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default ForStores;
