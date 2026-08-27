import React from "react";
import LegalLayout, { H2, P, UL, CONTACT_SUPPORT } from "./LegalLayout";

const ProhibitedItems: React.FC = () => {
  return (
    <LegalLayout
      title="Prohibited Items & Conduct"
      intro={
        <P>
          CollectX is for buying, selling and trading genuine Pokémon trading cards and sealed
          product. This page lists what is not allowed. Breaking these rules can get a listing
          removed and an account suspended or closed, and may be reported to the authorities.
        </P>
      }
    >
      <H2 id="items">Items you must not list</H2>
      <UL>
        <li>
          <strong>Counterfeit, replica, proxy, fan-made or unlicensed cards or sealed product</strong>,
          including "custom" or reprinted cards presented as genuine.
        </li>
        <li>
          <strong>Resealed or tampered sealed product</strong>, or product described as sealed that
          is not factory-sealed.
        </li>
        <li>
          <strong>Stolen goods</strong>, or anything you do not own or are not entitled to sell.
        </li>
        <li>
          Items that <strong>infringe someone's intellectual property</strong> or other rights.
        </li>
        <li>
          <strong>Weighted, mapped or "searched" packs and boxes</strong> sold on the basis of a
          claimed hit.
        </li>
        <li>
          Anything <strong>illegal to sell</strong> in the UK, or regulated goods you are not
          licensed to sell.
        </li>
        <li>Empty packaging, wrappers or "authenticity" materials sold to enable fakes.</li>
      </UL>

      <H2 id="listings">Listing rules</H2>
      <UL>
        <li>Describe every item accurately — condition, grading, and any flaws.</li>
        <li>Use your own photos of the actual item. No stock images or photos of a different copy.</li>
        <li>Do not misrepresent a card's grade, edition, rarity or print run.</li>
        <li>Set an honest price. No fake "sold" history or shill bidding.</li>
      </UL>

      <H2 id="conduct">Conduct</H2>
      <UL>
        <li>
          Do not take payment off-platform or ask a buyer or seller to complete a deal elsewhere to
          avoid fees or protection.
        </li>
        <li>No fraud, scams, money laundering, or sanctions evasion.</li>
        <li>No abusive, harassing, hateful or threatening messages, reviews or content.</li>
        <li>No spam, mass unsolicited messaging, or bot activity.</li>
        <li>Do not attempt to probe, scrape, overload or gain unauthorised access to CollectX.</li>
        <li>One person, one account, unless we agree otherwise in writing.</li>
      </UL>

      <H2 id="report">Reporting a problem</H2>
      <P>
        If you see a listing or a message that breaks these rules, use the <strong>Report</strong>
        link on the listing, or email {CONTACT_SUPPORT} with a link and a short description. Reports
        are private. If you have been scammed on a marketplace order, also open a dispute from the
        order page so we can hold the funds while we investigate.
      </P>

      <H2 id="enforcement">Enforcement</H2>
      <P>
        We may remove listings and content, limit or suspend accounts, hold funds pending
        investigation, and close accounts for breaches of these rules or the Terms of Service. Where
        practical and lawful we will tell you why. Serious cases (counterfeiting, stolen goods,
        fraud) may be referred to trading standards, the police or a rights holder.
      </P>
    </LegalLayout>
  );
};

export default ProhibitedItems;
