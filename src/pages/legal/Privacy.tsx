import React from "react";
import LegalLayout, {
  H2,
  H3,
  P,
  UL,
  OPERATOR,
  OPERATOR_ADDRESS,
  CONTACT_PRIVACY,
} from "./LegalLayout";

const Privacy: React.FC = () => {
  return (
    <LegalLayout
      title="Privacy Policy"
      intro={
        <P>
          This policy explains what personal data CollectX collects, why, who we share it with, and
          your rights. The data controller is {OPERATOR}, {OPERATOR_ADDRESS}. For any privacy
          question or to exercise a right, contact {CONTACT_PRIVACY}.
        </P>
      }
    >
      <H2 id="data-we-collect">1. Data we collect</H2>
      <H3>You give us</H3>
      <UL>
        <li>Account: email address, password (stored hashed by our auth provider), display name.</li>
        <li>
          Profile: avatar or pixel-avatar configuration, bio, location if you add it, want-list and
          collection contents.
        </li>
        <li>
          Listings and trades: card details, condition, photos you upload, prices, and messages you
          send other users.
        </li>
        <li>
          Card grading: photos of cards you submit to the AI grading feature.
        </li>
        <li>
          Store accounts: business details you provide in your store application and storefront.
        </li>
        <li>Support: anything you send us by email or in a support request.</li>
      </UL>
      <H3>Collected automatically</H3>
      <UL>
        <li>
          Usage and device data: pages viewed, navigation events, approximate interactions, browser
          and device type, and similar analytics we use to run and improve the service.
        </li>
        <li>
          Local storage: small values kept in your browser for things like your session and
          interface preferences.
        </li>
      </UL>
      <H3>From third parties</H3>
      <UL>
        <li>
          Payment and payout status from Stripe (for example whether a payment succeeded, or whether
          a seller has completed verification). We do <strong>not</strong> receive or store full card
          numbers.
        </li>
        <li>Card catalogue data and images from public trading-card data sources.</li>
      </UL>

      <H2 id="how-we-use">2. How and why we use your data</H2>
      <UL>
        <li>
          <strong>To provide the service</strong> &mdash; run your account, show your collection,
          match want-lists, enable trades, process orders and hold funds in escrow, deliver AI
          grading results. Legal basis: performance of our contract with you.
        </li>
        <li>
          <strong>To keep CollectX safe</strong> &mdash; prevent fraud, abuse and prohibited
          listings, enforce our terms, and meet anti-money-laundering and sanctions obligations.
          Legal basis: legitimate interests and legal obligation.
        </li>
        <li>
          <strong>To improve CollectX</strong> &mdash; analytics, debugging and product decisions.
          Legal basis: legitimate interests (and consent where required for non-essential
          analytics).
        </li>
        <li>
          <strong>To communicate</strong> &mdash; transactional emails and notifications about your
          account, trades and orders (contract), and, only if you opt in, product updates (consent).
        </li>
        <li>
          <strong>To comply with law</strong> &mdash; tax, accounting, and responding to lawful
          requests. Legal basis: legal obligation.
        </li>
      </UL>

      <H2 id="who-we-share">3. Who we share data with</H2>
      <P>We share personal data with service providers who process it on our instructions:</P>
      <UL>
        <li>
          <strong>Stripe</strong> &mdash; payment processing, escrow and seller payouts, including
          the identity verification Stripe carries out on sellers.
        </li>
        <li>
          <strong>Supabase</strong> &mdash; database, authentication, file storage and backend
          hosting.
        </li>
        <li>
          <strong>Anthropic</strong> &mdash; the AI model that produces card-grading estimates.
          Photos you submit for grading are sent to Anthropic to generate the result.
        </li>
        <li>
          <strong>Email delivery provider</strong> &mdash; to send transactional email.
        </li>
        <li>
          <strong>Analytics/monitoring providers</strong> &mdash; to measure and debug usage.
        </li>
      </UL>
      <P>We also share limited data with:</P>
      <UL>
        <li>
          <strong>Other users</strong> &mdash; your display name, avatar, public profile, ratings,
          listings, and the messages you send them. Your email address is not shown to other users.
        </li>
        <li>
          <strong>Authorities and advisers</strong> &mdash; where required by law, to establish or
          defend legal claims, or to a buyer of the business (your rights would be preserved).
        </li>
      </UL>
      <P>We do not sell your personal data.</P>

      <H2 id="transfers">4. International transfers</H2>
      <P>
        Some providers listed above (including Anthropic, and possibly Stripe and analytics
        providers) process data outside the UK, including in the United States. Where we transfer
        personal data outside the UK we rely on UK adequacy regulations or the International Data
        Transfer Agreement / UK Addendum to the EU Standard Contractual Clauses, with additional
        safeguards as needed.
      </P>

      <H2 id="retention">5. How long we keep it</H2>
      <UL>
        <li>Account and profile data: while your account is open, then deleted or anonymised within a reasonable period after closure.</li>
        <li>
          Transaction, order and dispute records, and tax records: retained for as long as required
          by law (generally up to 6&ndash;7 years).
        </li>
        <li>
          Card-grading photos: kept so you can see your scan history; you can delete individual
          scans, which removes the associated images.
        </li>
        <li>Messages: retained while relevant to a trade/order and for dispute purposes.</li>
        <li>Analytics/logs: retained for a limited period, then deleted or aggregated.</li>
      </UL>

      <H2 id="your-rights">6. Your rights</H2>
      <P>Under UK data protection law you have the right to:</P>
      <UL>
        <li>access a copy of your personal data;</li>
        <li>have inaccurate data corrected;</li>
        <li>have data erased in certain circumstances;</li>
        <li>restrict or object to certain processing, including direct marketing;</li>
        <li>data portability for data you provided, where processing is based on consent or contract;</li>
        <li>withdraw consent at any time, without affecting prior processing.</li>
      </UL>
      <P>
        To exercise any of these, email {CONTACT_PRIVACY}. We will respond within one month. If you
        are unhappy with how we handle your data you can complain to the Information Commissioner&rsquo;s
        Office (ico.org.uk), though we&rsquo;d appreciate the chance to help first.
      </P>

      <H2 id="cookies">7. Cookies and local storage</H2>
      <P>
        CollectX uses browser storage that is strictly necessary to run the service (keeping you
        signed in, remembering interface choices) and limited analytics storage to understand usage.
        Where non-essential storage requires consent, we ask for it. You can clear site data in your
        browser at any time; doing so will sign you out and reset preferences.
      </P>

      <H2 id="children">8. Children</H2>
      <P>
        CollectX is not intended for children under 13. Users aged 13&ndash;17 may use non-commercial
        features only with parental consent and supervision (see the Terms). If you believe a child
        has given us personal data without appropriate consent, contact {CONTACT_PRIVACY} and we will
        delete it.
      </P>

      <H2 id="security">9. Security</H2>
      <P>
        We use encryption in transit, access controls, row-level security on our database, and
        vetted processors. No system is perfectly secure; if a breach affects your rights and
        freedoms we will notify you and the ICO as required by law.
      </P>

      <H2 id="changes">10. Changes to this policy</H2>
      <P>
        We may update this policy. For material changes we will give reasonable notice before they
        take effect. The &ldquo;last updated&rdquo; date at the top shows the current version.
      </P>
    </LegalLayout>
  );
};

export default Privacy;
