import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowLeftRight,
  ArrowRight,
  BadgeCheck,
  CircleDollarSign,
  ScanLine,
  Tag,
  TrendingUp,
  Layers,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import LiveTradeFeed from "@/components/trades/LiveTradeFeed";

/** Decorative holo-foil card trio — pure CSS, no real card art (copyright). */
const HoloStack = () => {
  const W = 168; // front card width in px
  // back-left, back-right, front
  const cards = [
    { rot: -19, x: -168, y: -6, scale: 0.9, z: 1, from: "268 78% 62%", to: "224 92% 60%", dim: 0.92 },
    { rot: 16, x: 166, y: 12, scale: 0.9, z: 1, from: "45 82% 62%", to: "16 92% 60%", dim: 0.92 },
    { rot: -5, x: 0, y: 0, scale: 1.04, z: 2, from: "188 100% 54%", to: "268 76% 64%", dim: 1 },
  ];
  return (
    <div className="animate-float relative mx-auto hidden h-[380px] w-full max-w-[520px] items-center justify-center lg:flex" aria-hidden>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(circle at 50% 46%, hsl(var(--primary) / 0.26), transparent 60%)",
          filter: "blur(30px)",
        }}
      />
      {cards.map((c, i) => (
        <div
          key={i}
          className="absolute left-1/2 top-1/2 rounded-[16px] border border-white/15 shadow-[0_40px_80px_-24px_rgba(0,0,0,0.85)]"
          style={{
            width: `${W}px`,
            height: `${W * 1.4}px`,
            marginLeft: `-${W / 2}px`,
            marginTop: `-${(W * 1.4) / 2}px`,
            transform: `translate(${c.x}px, ${c.y}px) rotate(${c.rot}deg) scale(${c.scale})`,
            zIndex: c.z,
            animationDelay: `${i * 1.1}s`,
            background: `linear-gradient(145deg, hsl(${c.from} / ${0.95 * c.dim}) 0%, hsl(${c.to} / ${0.5 * c.dim}) 55%, hsl(0 0% 8% / 0.92) 100%)`,
          }}
        >
          <div
            className="absolute inset-0 rounded-[16px] mix-blend-screen"
            style={{ background: "linear-gradient(118deg, transparent 36%, hsl(0 0% 100% / 0.55) 46%, hsl(var(--gold) / 0.45) 50%, transparent 60%)" }}
          />
          <div className="absolute left-3 right-8 top-3 h-2 rounded-full bg-white/30" />
          <div className="absolute inset-x-3 top-8 bottom-12 rounded-lg bg-black/15" />
          <div className="absolute inset-x-3 bottom-3 h-7 rounded-lg bg-black/30 backdrop-blur-sm" />
          <div className="absolute bottom-[18px] left-5 h-2 w-14 rounded-full bg-white/40" />
        </div>
      ))}
    </div>
  );
};

const FEATURES = [
  {
    icon: ArrowLeftRight,
    title: "Card-for-card trades",
    body: "Propose swaps from real collection cards. Server-validated, with in-trade messaging, tracking, and two-party receipt confirmation.",
  },
  {
    icon: CircleDollarSign,
    title: "Buy & sell for cash",
    body: "List singles for sale. Payment is held in escrow and released to the seller only once the buyer confirms the card arrived.",
  },
  {
    icon: ScanLine,
    title: "AI card grading",
    body: "Point your camera at a card for an on-device centering measurement and a predicted PSA / BGS / CGC grade.",
  },
  {
    icon: TrendingUp,
    title: "Portfolio value tracking",
    body: "Every card and sealed box is valued daily from live market data — graded multipliers included — with a running history.",
  },
  {
    icon: Tag,
    title: "Live market prices",
    body: "TCGplayer market prices in GBP across the marketplace, trades, your want list, and every card page.",
  },
  {
    icon: BadgeCheck,
    title: "Verified stores",
    body: "Buy from vetted shops with their own storefronts — or sell your cards straight into a store's standing buy list.",
  },
];

const Index = () => {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-28 pb-20 md:pt-36 md:pb-28">
        <div className="aura pointer-events-none absolute -top-10 left-1/2 h-[520px] w-[900px] max-w-full -translate-x-1/2" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, hsl(0 0% 100% / 0.06) 1px, transparent 0)",
            backgroundSize: "38px 38px",
            maskImage: "radial-gradient(ellipse 70% 60% at 50% 30%, #000 40%, transparent 75%)",
          }}
        />
        <div className="container relative">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="anim-rise">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Collection · Trading · Marketplace
              </p>
              <h1 className="font-display text-4xl font-extrabold leading-[1.03] md:text-[54px] md:leading-[1.02]">
                Trade, sell and track
                <br className="hidden sm:block" /> your{" "}
                <span className="text-primary">Pokémon cards</span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground md:text-[17px]">
                Manage your whole collection, swap card-for-card with other collectors, buy and
                sell singles with escrow-protected payments, grade with your camera, and watch
                your portfolio value move with the market.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  asChild
                  className="rounded-full px-6 shadow-[0_16px_36px_-14px_hsl(var(--primary)/0.7)]"
                >
                  <Link to="/auth">
                    Get started <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="rounded-full px-6">
                  <Link to="/pokemons">Browse cards</Link>
                </Button>
                <Button size="lg" variant="ghost" asChild className="rounded-full px-5">
                  <Link to="/pokemon-sets">
                    <Layers className="mr-2 h-4 w-4" /> Sets
                  </Link>
                </Button>
              </div>
              <p className="mt-5 text-xs text-muted-foreground">
                Free to join · Escrow-protected payments · Prices from TCGplayer
              </p>
            </div>

            <div className="anim-rise" style={{ animationDelay: "120ms" }}>
              <HoloStack />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-secondary/20 py-16 md:py-24">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-extrabold md:text-[38px]">
              Everything a serious collector needs
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
              One place for the collection, the trades, the marketplace, and the numbers behind them.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }, i) => (
              <div
                key={title}
                className="anim-rise hover-lift rounded-2xl border border-border bg-card p-6"
                style={{ animationDelay: `${Math.min(i, 6) * 70 + 120}ms` }}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/25 bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mt-4 font-display text-lg font-extrabold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live feed (component brings its own heading + "All Trades" link) */}
      <section className="py-16 md:py-24">
        <div className="container">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Live on CollectX</p>
          <LiveTradeFeed />
        </div>
      </section>

      {/* Closing CTA */}
      <section className="relative overflow-hidden border-t border-border bg-secondary/20 py-20 md:py-28">
        <div className="aura pointer-events-none absolute left-1/2 top-1/2 h-[300px] w-[640px] -translate-x-1/2 -translate-y-1/2" />
        <div className="container relative text-center">
          <h2 className="font-display text-3xl font-extrabold md:text-[40px]">Start your collection</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground md:text-base">
            Add your cards, mark what's up for trade, and make your first move.
          </p>
          <Button
            size="lg"
            asChild
            className="mt-8 rounded-full px-7 shadow-[0_16px_36px_-14px_hsl(var(--primary)/0.7)]"
          >
            <Link to="/auth">
              Create your free account <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
