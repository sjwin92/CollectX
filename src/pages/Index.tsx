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
import { SmartImage } from "@/components/common/SmartImage";
import { useUser } from "@/hooks/useUser";

/**
 * Hero card showcase — three real catalogue cards, tilted and floating, each
 * linking to its card page. Images come from the same card-image source the
 * rest of the app uses (pokemontcg.io). Swap the ids below to feature others.
 */
const HERO_CARDS = [
  { id: "sv8pt5-161", name: "Umbreon ex", img: "https://images.pokemontcg.io/sv8pt5/161_hires.png", rot: -15, x: -172, y: 8, scale: 0.86, z: 1 },
  { id: "me2-125", name: "Mega Charizard X ex", img: "https://images.pokemontcg.io/me2/125_hires.png", rot: -3, x: 0, y: -4, scale: 1.06, z: 3 },
  { id: "sv4pt5-232", name: "Mew ex", img: "https://images.pokemontcg.io/sv4pt5/232_hires.png", rot: 14, x: 170, y: 14, scale: 0.86, z: 2 },
];

const HeroCards = () => {
  const W = 194; // front card width in px; real cards are ~63:88
  return (
    <div className="animate-float relative mx-auto hidden h-[400px] w-full max-w-[580px] items-center justify-center lg:flex">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(circle at 50% 46%, hsl(var(--primary) / 0.28), transparent 62%)",
          filter: "blur(34px)",
        }}
      />
      {HERO_CARDS.map((c) => (
        <Link
          key={c.id}
          to={`/card/${c.id}`}
          aria-label={c.name}
          className="group absolute left-1/2 top-1/2 block overflow-hidden rounded-[5%] ring-1 ring-white/10 shadow-[0_44px_80px_-26px_rgba(0,0,0,0.9)] transition-transform duration-300 hover:z-10"
          style={{
            width: `${W}px`,
            height: `${Math.round((W * 88) / 63)}px`,
            marginLeft: `-${W / 2}px`,
            marginTop: `-${Math.round((W * 88) / 63 / 2)}px`,
            transform: `translate(${c.x}px, ${c.y}px) rotate(${c.rot}deg) scale(${c.scale})`,
            zIndex: c.z,
          }}
        >
          <SmartImage
            src={c.img}
            alt={c.name}
            wrapperClassName="block h-full w-full"
            className="h-full w-full object-contain"
            fallback={
              <div className="flex h-full w-full items-center justify-center bg-secondary text-[11px] text-muted-foreground">
                {c.name}
              </div>
            }
          />
          <span className="holo rounded-[5%]" />
          <span className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/85 to-transparent px-2.5 pb-2 pt-6 text-[11px] font-semibold text-white opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            {c.name}
          </span>
        </Link>
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
  const { isSignedIn } = useUser();
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
                  <Link to={isSignedIn ? "/collection" : "/auth"}>
                    {isSignedIn ? "Go to your collection" : "Get started"} <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="rounded-full px-6">
                  <Link to={isSignedIn ? "/grade" : "/pokemons"}>
                    {isSignedIn ? "Grade a card" : "Browse cards"}
                  </Link>
                </Button>
                <Button size="lg" variant="ghost" asChild className="rounded-full px-5">
                  <Link to="/pokemon-sets">
                    <Layers className="mr-2 h-4 w-4" /> Sets
                  </Link>
                </Button>
              </div>
              <p className="mt-5 text-xs text-muted-foreground">
                {isSignedIn
                  ? "You're signed in · Escrow-protected payments · Prices from TCGplayer"
                  : "Free to join · Escrow-protected payments · Prices from TCGplayer"}
              </p>
            </div>

            <div className="anim-rise" style={{ animationDelay: "120ms" }}>
              <HeroCards />
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
          <h2 className="font-display text-3xl font-extrabold md:text-[40px]">
            {isSignedIn ? "Pick up where you left off" : "Start your collection"}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground md:text-base">
            {isSignedIn
              ? "Jump back into your collection, trades and the marketplace."
              : "Add your cards, mark what's up for trade, and make your first move."}
          </p>
          <Button
            size="lg"
            asChild
            className="mt-8 rounded-full px-7 shadow-[0_16px_36px_-14px_hsl(var(--primary)/0.7)]"
          >
            <Link to={isSignedIn ? "/collection" : "/auth"}>
              {isSignedIn ? "Open your collection" : "Create your free account"} <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
