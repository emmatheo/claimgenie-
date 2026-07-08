import express from "express";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { runRecovery, demoResult, type CaseInput } from "./engines/recovery.js";
import { RULES, type RecoveryType } from "./engines/rules.js";

const PORT = Number(process.env.PORT ?? 8080);
const MODE = process.env.MODE ?? "demo";
const API_KEY = process.env.ANTHROPIC_API_KEY ?? "";
const PRICE = process.env.PRICE_PER_CASE_USDT ?? "1.00";

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use((_, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type, X-PAYMENT");
  next();
});

const __dirname = dirname(fileURLToPath(import.meta.url));
app.use(express.static(join(__dirname, "..", "public")));

// -- service descriptor (for OKX listing + the UI) ---------------------------
app.get("/v1/info", (_, res) =>
  res.json({
    service: "ClaimGenie",
    tagline: "The AI agent that gets your money back",
    recoveryTypes: Object.keys(RULES),
    price: { amount: PRICE, asset: "USDT", model: "per-case (A2MCP)" },
    mode: MODE,
  })
);

// -- the core recovery endpoint (this is the ASP capability) -----------------
// In live mode this is x402/pay-per-call gated; in demo mode it's open so
// judges can try it. Same handler either way.
app.post("/v1/recover", async (req, res) => {
  const input = req.body as CaseInput;
  if (!input?.type || !input?.description) {
    return res.status(400).json({ error: "Provide { type, description } — tell me what happened." });
  }
  if (!(input.type in RULES)) {
    return res.status(400).json({ error: `Unknown type. Use one of: ${Object.keys(RULES).join(", ")}` });
  }
  try {
    if (MODE === "live" && API_KEY) {
      const result = await runRecovery(input, API_KEY);
      return res.json(result);
    }
    // demo mode: return the canned, high-quality result for the type.
    return res.json(demoResult(input.type as RecoveryType));
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? "Recovery failed." });
  }
});

// demo shortcut used by the UI's example buttons
app.get("/v1/demo/:type", (req, res) => {
  const t = req.params.type as RecoveryType;
  if (!(t in RULES)) return res.status(404).json({ error: "unknown type" });
  res.json(demoResult(t));
});

app.get("/health", (_, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`ClaimGenie running on :${PORT}  (mode: ${MODE})`);
  console.log(`UI: http://localhost:${PORT}   API: POST /v1/recover`);
});
