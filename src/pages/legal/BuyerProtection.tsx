import React from "react";
import LegalLayout, { H2, H3, P, UL, CONTACT_SUPPORT } from "./LegalLayout";

const BuyerProtection: React.FC = () => {
  return (
    <LegalLayout
      title="Buyer Protection & Disputes"
      intro={
        <P>
          When you buy a card through CollectX from another user or a store, your payment is
          protected until you have the item and it is what was described. This page explains how that
          works, when you can open a dispute, and how disputes are decided. It also covers refunds
          for services you buy from CollectX itself. Nothing here limits your legal rights as a
          consumer.
        </P>
      }
    >
      <H2 id="how-protection-works">1. How buyer protection works</H2>
      <UL>
        <li>
          When you pay for a marketplace listing or store item, the money is taken by our payment
          provider and <strong>held</strong> &mdash; it is not passed to the seller straight away.
        </li>
        <li>The seller dispatches the item with tracking within their stated handling time.</li>
        <li>
          When it arrives and is as described, you confirm receipt from the order page and the funds
          are released to the seller.
        </li>
        <li>
          If you take no action, the funds release automatically after the confirmation window shown
          on your order. So if something is wrong, act before that window closes.
        </li>
        <li>The buyer-protection fee shown at checkout pays for this held-funds and dispute process.</li>
      </UL>

      <H2 id="when-to-dispute">2. When you can open a dispute</H2>
      <P>You can open a dispute from the order page if:</P>
      <UL>
        <li>the item never arrives;</li>
        <li>it is significantly not as described, or it is the wrong item;</li>
        <li>it arrives damaged;</li>
        <li>it is counterfeit, a replica, a proxy, or otherwise not genuine.</li>
      </UL>
      <P>
        Open the dispute while the order is still in its held or shipped state and before the
        confirmation window closes. If you have already confirmed receipt, or the window has passed
        with no dispute, buyer protection for that order has ended &mdash; though you may still have
        rights against the seller directly or through your card issuer.
      </P>

      <H2 id="how-disputes-decided">3. How a dispute is decided</H2>
      <UL>
        <li>While a dispute is open, we keep the payment on hold.</li>
        <li>
          Both sides can submit evidence &mdash; photos, tracking, and the order message thread.
        </li>
        <li>
          We review it and decide, acting reasonably, whether to refund you in full or in part from
          the held funds, or to release payment to the seller.
        </li>
        <li>
          If a return is required, we will tell you where and how to send it. For counterfeit or
          not-as-described items the seller bears the return postage; keep proof of postage.
        </li>
        <li>
          Our decision on the release of held funds is final as between you and us. It does not
          remove any legal claim you have against the seller, or your right to a chargeback through
          your bank.
        </li>
      </UL>

      <H2 id="change-of-mind">4. Change of mind</H2>
      <UL>
        <li>
          <strong>Private sellers</strong> are not required to accept a return just because you
          changed your mind. Some may choose to &mdash; ask through the order message thread.
        </li>
        <li>
          <strong>Business and store sellers</strong> selling to a consumer may be required to offer
          a 14-day cancellation right under the Consumer Contracts Regulations 2013. Where that
          applies, you can cancel within 14 days of receiving the item and return it; the seller
          refunds the item price and basic outbound postage, and you normally pay return postage
          unless the seller says otherwise. This does not apply to personalised items or others
          excluded by law.
        </li>
        <li>
          Separately, your rights under the Consumer Rights Act 2015 apply against a business seller:
          goods must be as described, of satisfactory quality and fit for purpose. If they are not,
          raise it through the dispute process and we will help.
        </li>
      </UL>

      <H2 id="trades">5. Card-for-card trades</H2>
      <P>
        Trades do not involve money, so there is no held-funds protection. If a trade goes wrong,
        use the trade message thread and the rating system. We may assist, but we are not obliged to
        resolve disputes over items we never held.
      </P>

      <H2 id="collectx-services">6. Refunds for CollectX&rsquo;s own services</H2>
      <P>This covers subscriptions, scan credits, promoted-listing slots and similar.</P>
      <H3>Subscriptions (including the Business tier)</H3>
      <UL>
        <li>
          Cancel anytime from your account. Cancellation stops the next renewal; your plan stays
          active until the end of the period you have paid for.
        </li>
        <li>
          We do not refund part-used periods, except where the law requires or where we have
          materially failed to provide the service.
        </li>
      </UL>
      <H3>Credits, slots and other consumables</H3>
      <UL>
        <li>
          These are made available immediately. When you buy them you ask us to start providing them
          right away and acknowledge that once a credit or slot is used you lose the statutory
          14-day right to cancel for that used portion.
        </li>
        <li>
          If you contact {CONTACT_SUPPORT} within 14 days of purchase and have not used them, we
          refund the unused balance.
        </li>
        <li>
          If a service fails through our fault (for example a grading scan errors and consumes a
          credit), we re-credit or refund it.
        </li>
      </UL>
      <P>Approved service refunds go to your original payment method, normally within 5&ndash;10 business days.</P>

      <H2 id="how-to-raise">7. How to raise a dispute or refund</H2>
      <UL>
        <li>
          <strong>Marketplace or store order:</strong> open the order and use &ldquo;Open a
          dispute&rdquo; within the window shown, or contact {CONTACT_SUPPORT} if you cannot reach
          the order.
        </li>
        <li>
          <strong>CollectX service:</strong> email {CONTACT_SUPPORT} with your account email and
          what you bought.
        </li>
        <li>Include photos and a short description where relevant &mdash; it speeds things up.</li>
      </UL>

      <H2 id="timeframes">8. Timeframes</H2>
      <UL>
        <li>We aim to acknowledge disputes within 2 business days.</li>
        <li>Most disputes are decided within 7&ndash;14 days of us receiving evidence from both sides.</li>
        <li>Approved refunds are issued to your original payment method within 5&ndash;10 business days.</li>
      </UL>

      <H2 id="chargebacks">9. Card chargebacks</H2>
      <P>
        Our dispute process is the fastest route and does not remove your right to contact your card
        issuer. If you start a bank chargeback, please also tell us so we do not release held funds
        while it is being decided.
      </P>
    </LegalLayout>
  );
};

export default BuyerProtection;
