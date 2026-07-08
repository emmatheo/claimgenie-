// ============================================================================
// Recovery knowledge base — the "rights engine".
//
// Every recovery is only as strong as the rule it cites. This file encodes the
// concrete rights/policies the agent uses to turn "I lost money" into "you are
// owed X under Y, and here is the filing." Kept as structured data so the AI
// reasons over real rules instead of hallucinating them, and so the cited
// authority is always shown to the user (that's what makes a claim hard to
// refuse — and what makes the demo land).
//
// This is a hackathon reference set: correct in shape and materially accurate,
// but users should confirm current thresholds for their jurisdiction. The agent
// always surfaces the citation so nothing is a black box.
// ============================================================================

export type RecoveryType = "merchant" | "subscription" | "travel" | "crypto";

export interface Rule {
  id: string;
  title: string;
  authority: string;      // the law/policy/scheme the claim rests on
  region: string;         // where it applies
  summary: string;        // plain-language what it entitles you to
  triggers: string[];     // keywords that suggest this rule is relevant
  evidenceNeeded: string[];
  claimChannel: string;   // where the claim is actually filed
  typicalPayout?: string;
}

export const RULES: Record<RecoveryType, Rule[]> = {
  merchant: [
    {
      id: "chargeback-not-received",
      title: "Item not received / not as described",
      authority: "Card scheme chargeback rights (Visa/Mastercard reason codes 13.1/13.3)",
      region: "Global (card payments)",
      summary:
        "If you paid by card and the item never arrived or was materially not as described, you can dispute the charge with your bank and have it reversed.",
      triggers: ["never arrived", "not delivered", "wrong item", "not as described", "broken", "counterfeit", "fake"],
      evidenceNeeded: ["order confirmation", "payment proof", "seller communication", "photos if damaged/wrong"],
      claimChannel: "Your card issuer's dispute form (chargeback)",
      typicalPayout: "Full purchase amount",
    },
    {
      id: "uk-section75",
      title: "Section 75 protection (UK credit card, £100–£30,000)",
      authority: "Consumer Credit Act 1974, Section 75",
      region: "United Kingdom",
      summary:
        "For UK credit-card purchases between £100 and £30,000, the card provider is jointly liable with the seller — you can claim from the bank if the seller fails you.",
      triggers: ["uk", "credit card", "not delivered", "company went bust", "faulty"],
      evidenceNeeded: ["order confirmation", "credit card statement", "evidence of breach/non-delivery"],
      claimChannel: "Your credit card provider (Section 75 claim)",
      typicalPayout: "Full amount £100–£30,000",
    },
    {
      id: "us-fcba",
      title: "Billing error / undelivered goods (US credit card)",
      authority: "Fair Credit Billing Act (FCBA)",
      region: "United States",
      summary:
        "US credit-card holders can dispute billing errors and charges for goods/services not delivered as agreed, in writing within 60 days of the statement.",
      triggers: ["us", "usa", "credit card", "billing error", "double charged", "not delivered"],
      evidenceNeeded: ["statement showing charge", "proof of order", "evidence goods not delivered"],
      claimChannel: "Card issuer, written dispute within 60 days",
      typicalPayout: "Disputed amount",
    },
  ],
  subscription: [
    {
      id: "unauthorized-renewal",
      title: "Charged after cancellation / unwanted auto-renewal",
      authority: "Card scheme 'cancelled recurring transaction' chargeback + consumer law",
      region: "Global",
      summary:
        "If you were charged after cancelling, or auto-renewed without clear consent, you can demand a refund and dispute the charge as a cancelled recurring transaction.",
      triggers: ["auto-renew", "auto renew", "renewed", "after i cancelled", "kept charging", "free trial", "subscription"],
      evidenceNeeded: ["cancellation confirmation or attempt", "charge date after cancellation", "terms shown at signup"],
      claimChannel: "Merchant refund demand, then card dispute if refused",
      typicalPayout: "Charged amount(s), sometimes multiple periods",
    },
    {
      id: "us-negative-option",
      title: "Dark-pattern auto-renewal (US)",
      authority: "FTC Negative Option Rule / 'click to cancel' + state auto-renewal laws (e.g., California ARL)",
      region: "United States",
      summary:
        "US sellers must get clear consent for auto-renewals and make cancellation easy; failing that, charges can be reversed and refunds demanded.",
      triggers: ["us", "california", "hard to cancel", "couldn't cancel", "dark pattern", "trial converted"],
      evidenceNeeded: ["signup flow / terms", "cancellation attempts", "charges"],
      claimChannel: "Merchant demand citing ARL/FTC, then card dispute, then state AG complaint",
      typicalPayout: "Refund of improper charges",
    },
  ],
  travel: [
    {
      id: "eu261",
      title: "Flight delay / cancellation compensation (EU/UK)",
      authority: "Regulation (EC) 261/2004 (UK261 mirror post-Brexit)",
      region: "EU / UK departures & EU-carrier arrivals",
      summary:
        "For delays of 3+ hours, cancellations, or denied boarding not caused by extraordinary circumstances, you're owed €250–€600 depending on flight distance — separate from any refund.",
      triggers: ["flight", "delayed", "cancelled", "denied boarding", "eu", "europe", "3 hours", "missed connection"],
      evidenceNeeded: ["booking reference", "boarding pass / ticket", "flight number & date", "delay length"],
      claimChannel: "Airline's EU261 claim form, then national enforcement body if refused",
      typicalPayout: "€250 / €400 / €600 by distance",
    },
    {
      id: "us-dot-refund",
      title: "Cancelled/changed flight refund (US)",
      authority: "US DOT refund rule (2024) — cash refund for cancelled/significantly changed flights",
      region: "United States",
      summary:
        "US carriers must issue a prompt cash refund (not a voucher) when a flight is cancelled or significantly changed and you choose not to travel.",
      triggers: ["us", "usa", "flight", "cancelled", "schedule change", "voucher instead of refund"],
      evidenceNeeded: ["booking confirmation", "cancellation/change notice", "proof you declined rebooking"],
      claimChannel: "Airline refund request citing DOT rule, then DOT complaint",
      typicalPayout: "Full cash refund",
    },
    {
      id: "hotel-booking",
      title: "Hotel / booking not honored",
      authority: "Card chargeback + consumer contract rights",
      region: "Global",
      summary:
        "If a prepaid hotel or booking is not honored (overbooked, closed, materially different), the charge can be disputed and a refund demanded.",
      triggers: ["hotel", "booking", "overbooked", "reservation", "airbnb", "not honored", "closed"],
      evidenceNeeded: ["reservation confirmation", "payment proof", "evidence not honored"],
      claimChannel: "Platform/host refund, then card dispute",
      typicalPayout: "Prepaid amount",
    },
  ],
  crypto: [
    {
      id: "revoke-approval",
      title: "Active token approval draining risk",
      authority: "On-chain token allowance (ERC-20 approve) — revocable by owner",
      region: "On-chain (EVM)",
      summary:
        "If you approved a malicious or unlimited spender, they can move your tokens at any time. Revoking the allowance stops further loss immediately — the single most important recovery action.",
      triggers: ["approved", "approval", "allowance", "drained", "draining", "setapprovalforall", "unlimited"],
      evidenceNeeded: ["your wallet address", "the token/contract approved", "the spender address"],
      claimChannel: "Revoke transaction (revoke the allowance) from your own wallet",
      typicalPayout: "Prevents further loss (not a clawback)",
    },
    {
      id: "cex-inbound-trace",
      title: "Funds traced into a centralized exchange",
      authority: "Exchange AML/fraud process + law-enforcement freeze request",
      region: "Global (CEX-dependent)",
      summary:
        "If stolen funds moved to a known exchange deposit address, that exchange can sometimes freeze them on a timely, well-evidenced fraud report — especially with a police report reference.",
      triggers: ["scam", "stolen", "hacked", "sent to scammer", "phishing", "rug"],
      evidenceNeeded: ["victim wallet", "thief wallet", "transaction hashes", "destination exchange (from trace)", "police report ref"],
      claimChannel: "Exchange fraud/compliance report with tx evidence + law-enforcement report",
      typicalPayout: "Case-dependent; only if funds still held & frozen in time",
    },
    {
      id: "wrong-address",
      title: "Sent to wrong / mistyped address",
      authority: "Recipient goodwill / exchange support (if to a custodial address)",
      region: "On-chain",
      summary:
        "Funds sent to a wrong address are only recoverable if the destination is controlled by a recoverable party (e.g., an exchange's address) — the agent tells you honestly which case you're in.",
      triggers: ["wrong address", "mistyped", "wrong network", "sent to", "typo"],
      evidenceNeeded: ["transaction hash", "intended vs actual address", "whether destination is an exchange"],
      claimChannel: "Exchange support (if custodial destination); otherwise not recoverable",
      typicalPayout: "Only if destination is a recoverable custodian",
    },
    {
      id: "scam-report",
      title: "Scam report to registries & authorities",
      authority: "Chainabuse / national cybercrime units / scam databases",
      region: "Global",
      summary:
        "Reporting the scam address to public registries and authorities improves freeze odds, warns others, and creates the paper trail needed for any later recovery or insurance.",
      triggers: ["scam", "fraud", "rug", "phishing", "fake site", "impersonation"],
      evidenceNeeded: ["scam address/URL", "transaction hashes", "how the scam worked"],
      claimChannel: "Chainabuse report + national cybercrime reporting portal",
      typicalPayout: "No direct payout; enables freeze/insurance/warnings",
    },
  ],
};

/** Quick keyword classifier hint — the AI makes the final call, this narrows it. */
export function suggestRules(type: RecoveryType, text: string): Rule[] {
  const t = text.toLowerCase();
  const matched = RULES[type].filter((r) => r.triggers.some((k) => t.includes(k)));
  return matched.length ? matched : RULES[type];
}

/** Honest recoverability signal so the agent never sells false hope. */
export function recoverabilityNote(type: RecoveryType): string {
  switch (type) {
    case "crypto":
      return "Crypto recovery is honest-odds: revoking approvals and freezing funds at an exchange can work if acted on fast; funds sent irreversibly to a private wallet usually cannot be clawed back. Beware anyone promising guaranteed crypto recovery — that itself is often a scam.";
    default:
      return "These consumer rights are well-established; the stronger your evidence and the sooner you file, the higher the success rate.";
  }
}
