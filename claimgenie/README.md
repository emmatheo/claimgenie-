# 💸 ClaimGenie — the AI agent that gets your money back

**You lost money. ClaimGenie builds the case and recovers it.** Describe a loss in
plain words — a bad order, a subscription that kept charging, a delayed flight, a
crypto scam — and ClaimGenie tells you exactly what you're owed, under which rule,
and hands you the ready-to-file claim with the evidence checklist and where to send it.

Built as an **Agent Service Provider (A2MCP, pay-per-case)** for the OKX AI Genesis Hackathon.

## problem:
- **A painful money problem, for everyone.** Everyday users (refunds, subscriptions, flights)
  and crypto users (scams, drains, wrong sends) both lose money constantly and usually
  just eat the loss. Recovery is a proven paid service — firms take 20–35%.
- **Honest, which builds trust.** For crypto it never promises guaranteed recovery — it
  revokes the approval to stop the bleeding and files the exchange freeze report. That
  honesty is the opposite of the "recovery scams" that plague the space.
- **Real business + fits OKX.** Non-crypto welcome (OKX said so), monetizes per-case
  (A2MCP), and bridges both audiences under one agent.

## Four recovery lanes, one engine
Every case runs the same pipeline: **intake → classify → match the rule → assess odds → generate the filed artifact.**

| Lane | Example | Rule it cites | Artifact produced |
|---|---|---|---|
| 📦 Merchant | order never arrived | card chargeback / UK S75 / US FCBA | chargeback letter |
| 🔁 Subscription | charged after cancelling | cancelled-recurring + FTC negative-option | refund demand + dispute |
| ✈️ Travel | 5-hour flight delay | EU261 / US DOT refund rule | EU261 claim |
| 🪙 Crypto | approved a drainer | ERC-20 revoke + exchange freeze | revoke + fraud report |

The rules live in `src/engines/rules.ts` (grounding, so the AI cites real authority
instead of hallucinating). The reasoning + drafting is done by Claude in `src/engines/recovery.ts`.

## Run it locally
```bash
cd claimgenie
npm install
cp .env.example .env        # MODE=demo works with no API key
npm run dev                 # http://localhost:8080
```
Open the UI, click an example (delayed flight / scam approval), hit **Build my case**.
In `demo` mode it returns polished canned cases (great for judges, zero setup).
Set `MODE=live` + `ANTHROPIC_API_KEY` for real AI on any pasted case.

## Deploy + register as an ASP
See `REGISTER_OKX.md` — deploy to Railway/Render for a public HTTPS URL, then register
via an OKX agent client. Start early: listing review takes ~2 business days.

## Honesty & safety
Guidance, not legal advice — every result shows the rule it's based on so nothing is a
black box, and users review before filing. Crypto recovery is presented with honest odds;
ClaimGenie explicitly warns that anyone *guaranteeing* full crypto recovery is likely a scam.
