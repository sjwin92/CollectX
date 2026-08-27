import React from "react";
import LegalLayout, {
  H2,
  H3,
  P,
  UL,
  OPERATOR,
  OPERATOR_ADDRESS,
  CONTACT_LEGAL,
  CONTACT_SUPPORT,
} from "./LegalLayout";

const Terms: React.FC = () => {
  return (
    <LegalLayout
      title="Terms of Service"
      intro={
        <P>
          These terms are a contract between you and {OPERATOR} (&ldquo;CollectX&rdquo;,
          &ldquo;we&rdquo;, &ldquo;us&rdquo;). They govern your use of the CollectX website and app,
          including collection management, card-for-card trades, the cash marketplace, AI card
          grading, want-list matching and the CollectX for Business store tier. By creating an
          account or using CollectX you agree to these terms. If you do not agree, do not use
          CollectX.
        </P>
      }
    >
      <H2 id="who-we-are">1. Who we are and how to contact us</H2>
      <P>
        CollectX is operated by {OPERATOR}, {OPERATOR_ADDRESS}. You can contact us at{" "}
        {CONTACT_SUPPORT} for general support or {CONTACT_LEGAL} for legal notices.
      </P>

      <H2 id="eligibility">2. Eligibility and your account</H2>
      <UL>
        <li>
          You must be at least 18 years old to buy or sell using the cash marketplace or to hold a
          store account. Users aged 13&ndash;17 may use collection and trade features only with the
          consent and supervision of a parent or guardian, who accepts these terms on their behalf.
        </li>
        <li>
          You are responsible for everything that happens under your account and for keeping your
          login credentials secure. Tell us promptly at {CONTACT_SUPPORT} if you believe your
          account has been compromised.
        </li>
        <li>
          You must give accurate registration and profile information and keep it up to date. One
          person, one account, unless we agree otherwise in writing.
        </li>
      </UL>

      <H2 id="what-collectx-is">3. What CollectX is &mdash; and is not</H2>
      <P>
        CollectX is a platform that lets collectors manage collections and connect with each other
        to trade and buy trading cards. For peer-to-peer trades and marketplace sales,{" "}
        <strong>the contract for the cards is between the users involved</strong> &mdash; CollectX is
        not the buyer or the seller and does not take ownership of any card. CollectX is the seller
        only of its own paid services (subscriptions, scan credits, promoted listings and the
        Business tier), described in section 8.
      </P>
      <P>
        We provide tools, payment facilitation and a dispute process, but we do not guarantee the
        conduct of any user, the accuracy of any listing, or that a trade or sale will complete.
      </P>

      <H2 id="trades">4. Card-for-card trades</H2>
      <UL>
        <li>
          Trades are arranged directly between users. You are responsible for describing your cards
          accurately, for dispatching what you agreed to send, and for the condition of items you
          send.
        </li>
        <li>
          We may provide shipping guidance, tracking fields and a messaging thread, but posting and
          insuring a parcel is the sending user&rsquo;s responsibility.
        </li>
        <li>
          If a trade goes wrong, use the in-app trade thread and rating system first. We may assist
          but we are not obliged to resolve disputes over items we never held.
        </li>
      </UL>

      <H2 id="marketplace">5. The cash marketplace and store sales</H2>
      <H3>How payment works</H3>
      <UL>
        <li>
          When a buyer pays for a marketplace listing or a store item, the payment is taken by our
          payment provider (Stripe) and held. Funds are released to the seller after the buyer
          confirms delivery, or automatically after the confirmation window closes with no dispute
          raised.
        </li>
        <li>
          Buyers pay a buyer-protection fee and sellers pay a seller commission, both shown before
          you commit. Fees are set out in-app and may change on notice.
        </li>
        <li>
          Sellers must complete identity and payout verification with Stripe before funds can be
          paid out. Until a seller completes verification, their items cannot be purchased.
        </li>
      </UL>
      <H3>Seller obligations</H3>
      <UL>
        <li>Only list items you own and are entitled to sell.</li>
        <li>
          Describe each item accurately, including condition, grading and any flaws. Photos must be
          of the actual item.
        </li>
        <li>
          Dispatch within the stated handling time using a tracked method, and keep proof of
          postage.
        </li>
        <li>
          Business sellers must comply with their own legal obligations to consumers, including the
          Consumer Rights Act 2015 and, where applicable, the Consumer Contracts Regulations 2013
          (see the Buyer Protection &amp; Disputes page).
        </li>
      </UL>
      <H3>Buyer obligations</H3>
      <UL>
        <li>Pay in full through CollectX &mdash; do not arrange off-platform payment.</li>
        <li>
          Confirm delivery promptly once your item arrives and is as described, or raise a dispute
          within the window shown on your order.
        </li>
      </UL>

      <H2 id="authenticity">6. Authenticity, condition and grading</H2>
      <UL>
        <li>
          Sellers warrant that every item is genuine and not counterfeit, replica, proxy or stolen.
          Listing a counterfeit is a serious breach of these terms.
        </li>
        <li>
          CollectX does not physically inspect or authenticate items. Where a listing shows a
          third-party grade (for example PSA, BGS or CGC), that grade is the seller&rsquo;s
          representation and we do not verify it.
        </li>
        <li>
          <strong>AI card grading is an automated estimate, not a professional grade.</strong> It
          is provided for guidance only, may be wrong, and must not be relied on when buying,
          selling, insuring or valuing a card. It does not come from and is not endorsed by any
          grading company.
        </li>
      </UL>

      <H2 id="prohibited">7. Prohibited items and conduct</H2>
      <P>
        The <a className="underline" href="/prohibited-items">Prohibited Items &amp; Conduct</a> page
        has the full list and is part of these terms. In summary, you must not use CollectX to list,
        trade, sell or promote:
      </P>
      <UL>
        <li>counterfeit, replica, proxy or unlicensed cards or sealed product;</li>
        <li>stolen goods or goods you cannot legally sell;</li>
        <li>items that infringe a third party&rsquo;s intellectual property or other rights;</li>
        <li>anything illegal, or any regulated goods you are not licensed to sell.</li>
      </UL>
      <P>You also must not:</P>
      <UL>
        <li>
          circumvent CollectX to avoid fees, take payment off-platform, or solicit users to
          transact elsewhere;
        </li>
        <li>
          post false, misleading, abusive, harassing or unlawful content, reviews or messages;
        </li>
        <li>
          scrape, probe, overload or attempt to gain unauthorised access to the service, or upload
          malware;
        </li>
        <li>use CollectX for money laundering, fraud, or to evade sanctions.</li>
      </UL>

      <H2 id="business-tier">8. Paid services and the Business tier</H2>
      <UL>
        <li>
          Subscriptions renew automatically for successive periods until cancelled. You can cancel
          at any time from your account; cancellation takes effect at the end of the current paid
          period and we do not refund part-periods except where the law requires.
        </li>
        <li>
          Scan credits, promoted-listing slots and similar one-off purchases are consumable digital
          services. By buying them you ask us to make them available immediately and you acknowledge
          you lose the statutory 14-day right to cancel once they are used. Unused balances are
          handled as set out on the Buyer Protection &amp; Disputes page.
        </li>
        <li>
          Store accounts require approval, must keep their details accurate, and may be suspended or
          removed for breach of these terms.
        </li>
        <li>Fees and plan features may change on reasonable notice before your next renewal.</li>
      </UL>

      <H2 id="disputes">9. Disputes between users</H2>
      <P>
        For marketplace and store orders, if an item is not received or is materially not as
        described, raise a dispute from the order page within the window shown. While a dispute is
        open we hold the funds. We will review the evidence from both sides and decide, acting
        reasonably, whether to release funds to the seller, refund the buyer, or split. Our decision
        on release of held funds is final as between you and us, but it does not affect any legal
        rights you have against the other user or your card issuer.
      </P>

      <H2 id="your-content">10. Your content</H2>
      <P>
        You keep ownership of the photos, text and other content you upload. You grant CollectX a
        worldwide, non-exclusive, royalty-free licence to host, store, reproduce, adapt and display
        that content for the purpose of operating and promoting the service. You are responsible for
        having the rights to everything you upload.
      </P>

      <H2 id="ip">11. Intellectual property and third-party marks</H2>
      <P>
        &ldquo;Pok&eacute;mon&rdquo;, card names, artwork and related marks are the property of
        Nintendo, The Pok&eacute;mon Company and their affiliates. CollectX is an independent
        platform and is <strong>not affiliated with, endorsed by or sponsored by</strong> Nintendo,
        The Pok&eacute;mon Company, or any grading company. Card data and images are used to
        identify collectible items being managed, traded or sold by users. All CollectX branding and
        software is owned by us or our licensors.
      </P>

      <H2 id="availability">12. Availability, changes and beta features</H2>
      <P>
        We may change, suspend or withdraw features, and some features are offered on an early-access
        or beta basis and may be unstable. We aim to keep the service available but we do not
        guarantee it will be uninterrupted or error-free.
      </P>

      <H2 id="suspension">13. Suspension and termination</H2>
      <P>
        You can close your account at any time. We may suspend or close your account, remove
        listings or content, and withhold funds pending investigation if we reasonably believe you
        have breached these terms or the law, or to protect other users, us or our payment
        providers. Where practical and lawful we will tell you why.
      </P>

      <H2 id="liability">14. Our liability</H2>
      <P>Nothing in these terms limits liability that cannot be limited by law, including for:</P>
      <UL>
        <li>death or personal injury caused by our negligence;</li>
        <li>fraud or fraudulent misrepresentation;</li>
        <li>any breach of your non-excludable statutory rights as a consumer.</li>
      </UL>
      <P>Subject to that, and to the fullest extent permitted by law:</P>
      <UL>
        <li>
          CollectX is not liable for the acts or omissions of other users, including non-delivery,
          misdescription, counterfeits or the condition of items sent between users;
        </li>
        <li>
          we are not liable for business losses (including loss of profit, revenue, goodwill or
          data), or for indirect or consequential loss;
        </li>
        <li>
          our total liability to you arising out of or in connection with the service in any 12-month
          period is limited to the greater of (a) the total fees you paid CollectX in that period and
          (b) &pound;100.
        </li>
      </UL>
      <P>
        If you are a consumer, this section does not affect your statutory rights, including any
        claim you may have against another user or, for eligible card payments, a chargeback through
        your bank.
      </P>

      <H2 id="indemnity">15. Indemnity</H2>
      <P>
        If you use CollectX as a business, you agree to indemnify us against losses, liabilities and
        reasonable costs arising from your breach of these terms, your listings or items, or your
        infringement of any third-party right.
      </P>

      <H2 id="changes">16. Changes to these terms</H2>
      <P>
        We may update these terms. For material changes we will give reasonable notice (for example
        by email or an in-app notice) before they take effect. Continuing to use CollectX after the
        effective date means you accept the updated terms.
      </P>

      <H2 id="law">17. Governing law and jurisdiction</H2>
      <P>
        These terms and any dispute arising from them are governed by the law of England and Wales.
        The courts of England and Wales have exclusive jurisdiction, except that if you are a
        consumer resident elsewhere in the UK you may also bring proceedings in your local courts.
        Nothing here removes your right to use an applicable alternative dispute resolution scheme.
      </P>

      <H2 id="general">18. General</H2>
      <UL>
        <li>
          If any provision is found unenforceable, the rest continues in force.
        </li>
        <li>
          We may transfer our rights and obligations under these terms to another entity; your
          rights are not affected.
        </li>
        <li>
          These terms, together with the Privacy Policy and Buyer Protection &amp; Disputes page, are the
          entire agreement between us about the service.
        </li>
      </UL>
    </LegalLayout>
  );
};

export default Terms;
