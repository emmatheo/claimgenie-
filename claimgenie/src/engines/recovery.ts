// ============================================================================
// The recovery engine — the heart of ClaimGenie.
//
// One pipeline for every case, regardless of type:
//   intake -> classify -> match rights -> assess odds -> generate filed artifact
//
// The AI (Claude) does the reasoning and drafting, but it is *grounded* in the
// structured rules from rules.ts, and it is instructed to cite the specific
// authority and never promise guaranteed recovery. The output is a complete,
// ready-to-send artifact: the actual claim letter / dispute / report, plus the
// evidence checklist and where to file it.
// ============================================================================

import { RULES, suggestRules, recoverabilityNote, type RecoveryType, type Rule } from "./rules.js";

export interface CaseInput {
  type: RecoveryType;
  description: string;          // what happened, in the user's words
  amount?: string;              // e.g. "$340" or "0.5 ETH"
  region?: string;              // helps pick the right rule set
  evidence?: Record<string, string>; // any details they pasted (order #, tx hash, dates...)
}

export interface RecoveryResult {
  type: RecoveryType;
  verdict: "recoverable" | "partial" | "unlikely";
  amountOwed: string;
  confidence: number;           // 0-100
  ruleApplied: { title: string; authority: string; region: string };
  reasoning: string;            // plain-language why
  evidenceChecklist: { item: string; have: boolean }[];
  artifact: { kind: string; channel: string; content: string }; // the thing to file
  honestNote: string;
  nextSteps: string[];
}

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-6";

/**
 * Build the grounded prompt and call Claude. The API key is read from env on
 * the server; the browser never sees it. In OKX A2MCP deployment this same
 * function sits behind the paid endpoint.
 */
export async function runRecovery(input: CaseInput, apiKey: string): Promise<RecoveryResult> {
  const candidateRules = suggestRules(input.type, input.description);
  const prompt = buildPrompt(input, candidateRules);

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`AI call failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const text = (data.content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
  return parseResult(text, input, candidateRules);
}

function buildPrompt(input: CaseInput, rules: Rule[]): string {
  const rulesBlock = rules
    .map((r) => `- ${r.title} [${r.id}] | authority: ${r.authority} | region: ${r.region} | entitles: ${r.summary} | file at: ${r.claimChannel} | typical: ${r.typicalPayout ?? "varies"}`)
    .join("\n");

  return `You are ClaimGenie, an AI money-recovery agent. A user has lost money and wants it back. Your job: determine what they are owed and under which specific rule, then WRITE THE ACTUAL ARTIFACT they will file to recover it.

CASE
Type: ${input.type}
Amount: ${input.amount ?? "unspecified"}
Region: ${input.region ?? "unspecified"}
What happened: ${input.description}
Evidence provided: ${JSON.stringify(input.evidence ?? {})}

APPLICABLE RULES (ground your answer ONLY in these; cite the exact one you use):
${rulesBlock}

RULES OF CONDUCT
- Cite the specific authority (law/scheme/policy) that entitles them. No vague "you may be able to."
- Be HONEST about odds. For crypto especially: never promise guaranteed recovery; if funds are irreversibly gone, say so and pivot to stopping further loss + reporting. ${recoverabilityNote(input.type)}
- The artifact must be complete and ready to send — a real chargeback letter, EU261 claim, cancellation+refund demand, exchange fraud report, or revoke instruction — addressed correctly, referencing the evidence, firm and specific.

Return ONLY valid JSON, no markdown, in exactly this shape:
{
  "verdict": "recoverable" | "partial" | "unlikely",
  "amountOwed": "string (e.g. '€600' or 'up to $340' or 'prevents further loss')",
  "confidence": 0-100,
  "ruleId": "the [id] you used",
  "reasoning": "2-3 sentences, plain language, why they're owed this",
  "evidenceChecklist": [{"item":"string","have":true|false}],
  "artifactKind": "e.g. 'Chargeback letter' / 'EU261 claim' / 'Refund demand' / 'Exchange fraud report' / 'Revoke instruction'",
  "artifactContent": "the full ready-to-send text",
  "nextSteps": ["step 1","step 2"]
}`;
}

function parseResult(text: string, input: CaseInput, rules: Rule[]): RecoveryResult {
  let j: any;
  try {
    const clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
    j = JSON.parse(clean);
  } catch {
    // Defensive fallback so the service never hard-fails in a demo.
    const r = rules[0];
    j = {
      verdict: "partial", amountOwed: input.amount ?? "varies", confidence: 55,
      ruleId: r.id, reasoning: "Automated parse fallback — see rule applied.",
      evidenceChecklist: r.evidenceNeeded.map((e) => ({ item: e, have: false })),
      artifactKind: "Claim draft", artifactContent: text.slice(0, 1200),
      nextSteps: [`File at: ${r.claimChannel}`],
    };
  }
  const rule = rules.find((r) => r.id === j.ruleId) ?? rules[0];
  return {
    type: input.type,
    verdict: j.verdict,
    amountOwed: j.amountOwed,
    confidence: Number(j.confidence) || 50,
    ruleApplied: { title: rule.title, authority: rule.authority, region: rule.region },
    reasoning: j.reasoning,
    evidenceChecklist: j.evidenceChecklist ?? [],
    artifact: { kind: j.artifactKind, channel: rule.claimChannel, content: j.artifactContent },
    honestNote: recoverabilityNote(input.type),
    nextSteps: j.nextSteps ?? [],
  };
}

/** Offline demo result (no API key needed) so judges can always see it work. */
export function demoResult(type: RecoveryType): RecoveryResult {
  const samples: Record<RecoveryType, RecoveryResult> = {
    travel: {
      type: "travel", verdict: "recoverable", amountOwed: "€600", confidence: 92,
      ruleApplied: { title: "Flight delay compensation (EU/UK)", authority: "Regulation (EC) 261/2004", region: "EU / UK" },
      reasoning: "Your flight was delayed over 3 hours on an EU departure with no extraordinary cause, so you're owed fixed compensation separate from any ticket refund.",
      evidenceChecklist: [
        { item: "Booking reference", have: true }, { item: "Boarding pass", have: true },
        { item: "Flight number & date", have: true }, { item: "Delay length (3h+)", have: true },
      ],
      artifact: {
        kind: "EU261 compensation claim", channel: "Airline EU261 form → national enforcement body if refused",
        content:
          "To: Customer Relations\nRe: EU261 Compensation Claim — Flight [XX000], [DATE]\n\nI am claiming compensation of €600 under Regulation (EC) 261/2004 for the delay of flight [XX000] from [ORIGIN] to [DESTINATION] on [DATE], which arrived [N] hours late. This delay was not caused by extraordinary circumstances. As the distance exceeds 3,500 km, the applicable sum is €600.\n\nBooking reference: [PNR]. Please remit payment within 14 days to [details]. If declined, I will escalate to the national enforcement body and pursue the claim formally.\n\n[Name]",
      },
      honestNote: "Well-established right; airlines often refuse first — the escalation path is what gets it paid.",
      nextSteps: ["Send the claim to the airline", "If refused or ignored 14 days, file with the national enforcement body", "Keep all boarding passes"],
    },
    merchant: {
      type: "merchant", verdict: "recoverable", amountOwed: "up to $340", confidence: 84,
      ruleApplied: { title: "Item not received / not as described", authority: "Visa/Mastercard chargeback 13.1/13.3", region: "Global (card)" },
      reasoning: "You paid by card and the item never arrived, so you can reverse the charge through your bank's dispute process.",
      evidenceChecklist: [
        { item: "Order confirmation", have: true }, { item: "Payment proof", have: true },
        { item: "Seller communication", have: false }, { item: "Delivery tracking (missing)", have: true },
      ],
      artifact: {
        kind: "Chargeback dispute letter", channel: "Your card issuer's dispute form",
        content:
          "To: [Card Issuer] Disputes\nRe: Chargeback — [Merchant], $340, [DATE]\n\nI am disputing a $340 charge to [Merchant] on [DATE] for goods never received. Order [#], estimated delivery [DATE], has not arrived and the seller has not resolved after [contact attempts]. Under card scheme rules for goods not received, I request a full reversal.\n\nEvidence attached: order confirmation, payment record, correspondence. Please credit my account.\n\n[Name / card last 4]",
      },
      honestNote: "Strong right; file within your issuer's window (often 120 days).",
      nextSteps: ["Submit to your card issuer", "Attach the order + payment proof", "Escalate to scheme dispute if declined"],
    },
    subscription: {
      type: "subscription", verdict: "recoverable", amountOwed: "$59.97 (3 periods)", confidence: 80,
      ruleApplied: { title: "Charged after cancellation", authority: "Cancelled recurring transaction chargeback + FTC negative-option", region: "Global / US" },
      reasoning: "You were charged after cancelling, so you can demand a refund and dispute the charges as cancelled recurring transactions.",
      evidenceChecklist: [
        { item: "Cancellation confirmation", have: true }, { item: "Charge dates after cancel", have: true },
        { item: "Signup terms", have: false },
      ],
      artifact: {
        kind: "Refund demand + dispute", channel: "Merchant refund demand, then card dispute",
        content:
          "To: [Merchant] Billing\nRe: Refund of charges after cancellation\n\nI cancelled on [DATE] (confirmation [#]) yet was charged $19.99 on [3 dates]. I did not authorize these renewals. Please refund $59.97 within 7 days. Failing that, I will dispute all three as cancelled recurring transactions with my card issuer and report the dark-pattern renewal to the FTC.\n\n[Name / account]",
      },
      honestNote: "Keep the cancellation confirmation — it's the whole case.",
      nextSteps: ["Send the refund demand", "If refused in 7 days, dispute each charge", "Report the pattern if egregious"],
    },
    crypto: {
      type: "crypto", verdict: "partial", amountOwed: "Stop further loss + freeze attempt", confidence: 45,
      ruleApplied: { title: "Active approval + exchange trace", authority: "ERC-20 allowance revoke + exchange fraud report", region: "On-chain" },
      reasoning: "A malicious contract still holds an unlimited approval on your USDC — revoking it stops further theft now. The stolen funds traced to a known exchange, so a fast, evidenced fraud report gives a real (not guaranteed) freeze chance.",
      evidenceChecklist: [
        { item: "Your wallet address", have: true }, { item: "Malicious spender address", have: true },
        { item: "Transaction hashes", have: true }, { item: "Destination exchange (from trace)", have: true },
        { item: "Police report reference", have: false },
      ],
      artifact: {
        kind: "Revoke + exchange fraud report", channel: "Revoke tx from your wallet, then exchange compliance report",
        content:
          "STEP 1 — REVOKE NOW: Revoke the USDC allowance granted to [spender] on [chain]. This stops any further withdrawals immediately.\n\nSTEP 2 — EXCHANGE FREEZE REPORT:\nTo: [Exchange] Compliance/Fraud\nRe: Urgent fraud — funds deposited to your platform\n\nStolen funds from my wallet [victim] were moved via [tx hashes] to deposit address [addr] on your exchange on [DATE/time]. This was theft via a malicious contract approval. I request an urgent freeze pending investigation. I am filing a police report and will provide the reference. Time is critical.\n\n[Name / contact]",
      },
      honestNote: "Honest odds: revoking works for sure; the freeze only works if funds are still on the exchange and you move fast. Anyone guaranteeing full crypto recovery is themselves a scam.",
      nextSteps: ["Revoke the approval immediately", "File the exchange fraud report with tx proof", "File a police/cybercrime report and send the reference", "Report the address to Chainabuse to warn others"],
    },
  };
  return samples[type];
}
