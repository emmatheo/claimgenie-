# Shipping ClaimGenie to OKX.AI (ASP registration)

ClaimGenie registers as an **A2MCP** service (pay-per-case). The gate: OKX listing
review takes up to ~2 business days against the July 17 deadline — deploy and
submit for review EARLY (aim July ~14).

## Order of operations (deployment must come before registration)

### 1. Deploy to a public HTTPS URL
Easiest: **Railway** or **Render**.
- Push this repo to GitHub.
- New project from repo. Build: `npm install && npm run build`. Start: `npm start`.
- Env vars: PORT (host provides), MODE=live, ANTHROPIC_API_KEY (from console.anthropic.com),
  PRICE_PER_CASE_USDT=1.00, PAYEE_ADDRESS (step 3), PUBLIC_URL (your URL).
- Verify: open `https://YOUR_URL/v1/info` → JSON; open `https://YOUR_URL/` → the UI.

Keep MODE=demo until your API key + payout are set, so the live URL always
shows working canned cases to anyone (including judges) with zero setup.

### 2. Get an Anthropic API key
console.anthropic.com → API keys → create one → put in ANTHROPIC_API_KEY. This
powers the real recovery reasoning. The browser never sees it (server-side only).

### 3. Set up the OKX Agentic Wallet (via an agent client)
Use Claude Code / Codex / Hermes / OpenClaw:
- `npx skills add okx/onchainos-skills`
- Tell the agent: "Set up my OKX Agentic Wallet." Copy the wallet address → PAYEE_ADDRESS. Redeploy.

### 4. Register the ASP
Tell your agent client:
> Register me as an Agent Service Provider on OKX AI. Mode: A2MCP (pay-per-call).
> Service: ClaimGenie — an AI money-recovery agent. Endpoint: https://YOUR_URL/v1/recover.
> Price: 1 USDT per case. Description: [paste below].

Description to paste:
> ClaimGenie turns "I lost money" into a filed claim. Users describe a loss —
> a bad order, a subscription charged after cancelling, a delayed flight, or a
> crypto scam — and ClaimGenie identifies exactly what they're owed and under
> which rule (chargeback rights, FTC negative-option, EU261, on-chain revoke +
> exchange freeze), then generates the ready-to-file claim with the evidence
> checklist and where to send it. Honest about odds; never promises guaranteed
> crypto recovery. One input, real money back.

Submit for review. Screenshot the pending status + date.

### 5. Submit to the hackathon
Post on X with **#OKXAI**: what it is, the demo (screen-record the UI: paste a
delayed flight → €600 claim; paste a scam approval → revoke + freeze report),
your live URL, and the ASP/Agent ID. No separate video upload needed — the demo
lives in the X post.

## Demo script (for the X post, ~90s, text-on-screen)
1. "You lost money. Most people just eat it. This agent gets it back." 
2. Paste the delayed-flight example → hit Build my case → the payout counts up to €600, the EU261 rule is cited, the claim letter is written. "It knew the regulation, the amount, and wrote the filing."
3. Switch to the crypto example → paste the scam approval → "It doesn't oversell: it revokes the approval to stop the bleeding, then writes the exchange freeze report with the tx trace." (Honesty = trust.)
4. "Four kinds of loss, one agent, real money back. Pay per case. Live on OKX.AI." + link.

## Checklist
- [ ] /v1/info and / (UI) load over HTTPS
- [ ] MODE=live with API key + PAYEE_ADDRESS set (demo mode fallback still works)
- [ ] ASP registered (A2MCP), submitted for review, pending screenshot saved
- [ ] #OKXAI post with demo + live link + Agent ID
- [ ] Tested logged-out / incognito
