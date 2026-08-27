import React from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { AlertTriangle } from "lucide-react";

/**
 * Shared shell for the /terms, /privacy and /buyer-protection pages.
 *
 * These are working drafts written for a UK marketplace that facilitates
 * peer-to-peer sales, holds buyer funds in escrow via Stripe, and runs an
 * AI card-grading feature. Everything in [SQUARE BRACKETS] is a placeholder.
 * Get them reviewed by a solicitor before taking real payments — especially
 * the payments/liability sections and the data-processing list.
 */

export const LEGAL_EFFECTIVE_DATE = "[EFFECTIVE DATE]";
// The legal operator of CollectX. A sole trader's terms must name the
// individual before launch; until then this stays a bracketed placeholder.
export const OPERATOR = "[OPERATOR NAME]";
export const OPERATOR_ADDRESS = "[OPERATOR ADDRESS]";
export const CONTACT_LEGAL = "legal@collectx.example";
export const CONTACT_PRIVACY = "privacy@collectx.example";
export const CONTACT_SUPPORT = "support@collectx.example";

const pages = [
  { to: "/terms", label: "Terms of Service" },
  { to: "/privacy", label: "Privacy Policy" },
  { to: "/buyer-protection", label: "Buyer Protection & Disputes" },
  { to: "/prohibited-items", label: "Prohibited Items" },
];

export const H2: React.FC<React.PropsWithChildren<{ id?: string }>> = ({ id, children }) => (
  <h2 id={id} className="mt-10 mb-3 text-xl font-semibold tracking-tight scroll-mt-24">
    {children}
  </h2>
);

export const H3: React.FC<React.PropsWithChildren> = ({ children }) => (
  <h3 className="mt-6 mb-2 text-base font-semibold">{children}</h3>
);

export const P: React.FC<React.PropsWithChildren> = ({ children }) => (
  <p className="mb-3 text-sm leading-relaxed text-muted-foreground">{children}</p>
);

export const UL: React.FC<React.PropsWithChildren> = ({ children }) => (
  <ul className="mb-3 ml-5 list-disc space-y-1.5 text-sm leading-relaxed text-muted-foreground marker:text-muted-foreground/60">
    {children}
  </ul>
);

interface LegalLayoutProps {
  title: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
}

const LegalLayout: React.FC<LegalLayoutProps> = ({ title, intro, children }) => {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="container max-w-3xl py-16">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Legal</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Last updated {LEGAL_EFFECTIVE_DATE} &middot; Operated by {OPERATOR}
          </p>

          <div className="mt-6 flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <p className="text-xs leading-relaxed text-amber-200/90">
              Draft for review. This document has not yet been checked by a solicitor. Placeholders
              in [square brackets] must be completed and the whole document reviewed before CollectX
              takes real payments.
            </p>
          </div>

          <nav className="mt-6 flex flex-wrap gap-2">
            {pages.map((p) => (
              <Link
                key={p.to}
                to={p.to}
                className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {p.label}
              </Link>
            ))}
          </nav>

          {intro && <div className="mt-8">{intro}</div>}

          <div className="mt-8">{children}</div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default LegalLayout;
