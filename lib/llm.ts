import { QuantSnapshot } from "./quant";

export interface LLMAnalysisResult {
  signal: QuantSnapshot["signal"];
  confidence: number; // 0-100
  summary: string;
  bullishFactors: string[];
  bearishFactors: string[];
  risk: "low" | "medium" | "high";
  reasoning: string;
  confidenceExplanation: string;
}

export interface LLMConfig {
  baseUrl: string;
  model: string;
  enabled: boolean;
  timeoutMs: number;
}

export function getLLMConfig(): LLMConfig {
  return {
    baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
    model: process.env.OLLAMA_MODEL || "qwen3:8b",
    enabled: process.env.ENABLE_LLM_ANALYSIS !== "false",
    timeoutMs: Number(process.env.OLLAMA_TIMEOUT_MS || 30000),
  };
}

function fmt(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value))
    return "n/a";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function fmtPct(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value))
    return "n/a";
  return `${fmt(value, 2)}%`;
}

export function buildPrompt(snapshot: QuantSnapshot): string {
  const i = snapshot.indicators;
  const f = snapshot.features;
  const s = snapshot.scores;

  return `You are a senior crypto quant analyst. Analyze the following coin using only the provided technical indicators and return a strict JSON object.

Coin: ${snapshot.name} (${snapshot.symbol})
Price: $${fmt(snapshot.price, 4)}
Quant signal: ${snapshot.signal}
Quant confidence: ${snapshot.confidence}%

Indicators:
- RSI(14): ${fmt(i.rsi14)}
- StochRSI K/D: ${fmt(i.stochRsiK)} / ${fmt(i.stochRsiD)}
- MACD histogram: ${fmt(i.macdHistogram)}
- SMA20/SMA50 distance: ${fmtPct(f.priceToSma20 ? f.priceToSma20 * 100 : null)} / ${fmtPct(f.priceToSma50 ? f.priceToSma50 * 100 : null)}
- EMA200 distance: ${fmtPct(f.priceToEma200 ? f.priceToEma200 * 100 : null)}
- Bollinger upper/lower distance: ${fmtPct(f.priceToBbUpper ? f.priceToBbUpper * 100 : null)} / ${fmtPct(f.priceToBbLower ? f.priceToBbLower * 100 : null)}
- ATR(14): ${fmt(i.atr14)}
- ADX(14): ${fmt(i.adx14)}
- VWAP: $${fmt(i.vwap, 4)}
- OBV: ${fmt(i.obv, 0)}
- CMF(20): ${fmt(i.cmf20)}
- MFI(14): ${fmt(i.mfi14)}
- Williams %R(14): ${fmt(i.williamsR14)}
- ROC(10): ${fmtPct(i.roc10)}
- Momentum(10): ${fmt(i.momentum10, 4)}
- Volatility(20): ${fmtPct(i.volatility20)}
- Sharpe(20): ${fmt(i.sharpe20)}
- Volume trend: ${i.volumeTrend}

Features:
- RSI trend: ${f.rsiTrend}
- RSI divergence: ${f.rsiDivergence}
- MACD cross: ${f.macdCross}
- Volume spike: ${f.volumeSpike}
- ATR expansion: ${f.atrExpansion}

Sub-scores (0-100):
- Momentum: ${fmt(s.momentum)}
- Trend: ${fmt(s.trend)}
- Mean reversion: ${fmt(s.meanReversion)}
- Volume: ${fmt(s.volume)}
- Volatility/risk: ${fmt(s.volatilityRisk)}
- Composite: ${fmt(s.composite)}

Return ONLY a JSON object with these exact keys and no markdown, no commentary, no code fences:
{
  "signal": "strong_buy|buy|hold|sell|strong_sell",
  "confidence": number 0-100,
  "summary": "one or two sentences summarizing the trend outlook",
  "bullishFactors": ["short bullet 1", "short bullet 2"],
  "bearishFactors": ["short bullet 1", "short bullet 2"],
  "risk": "low|medium|high",
  "reasoning": "one concise paragraph explaining the key drivers",
  "confidenceExplanation": "one sentence explaining why the confidence is high/medium/low"
}

Rules:
- Confidence must reflect how strongly the evidence supports the signal, not just mirror the quant score.
- If indicators conflict, choose hold or a weak signal with lower confidence.
- Never invent data not shown above.
- Keep summaries concise and actionable.`;
}

export function parseLLMResponse(text: string): LLMAnalysisResult | null {
  const clean = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/gi, "")
    .trim();

  const firstBrace = clean.indexOf("{");
  const lastBrace = clean.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace)
    return null;

  const json = clean.slice(firstBrace, lastBrace + 1);

  try {
    const parsed = JSON.parse(json);
    const validSignals = ["strong_buy", "buy", "hold", "sell", "strong_sell"];
    const validRisks = ["low", "medium", "high"];

    let rawSignal = parsed.signal;
    if (rawSignal === "neutral") rawSignal = "hold";
    if (rawSignal === "strong buy") rawSignal = "strong_buy";
    if (rawSignal === "strong sell") rawSignal = "strong_sell";

    const signal = validSignals.includes(rawSignal) ? rawSignal : "hold";
    const confidence =
      typeof parsed.confidence === "number"
        ? Math.max(0, Math.min(100, Math.round(parsed.confidence)))
        : 50;
    const summary =
      typeof parsed.summary === "string" && parsed.summary.trim().length > 0
        ? parsed.summary.trim()
        : "No summary available.";
    const bullishFactors = Array.isArray(parsed.bullishFactors)
      ? parsed.bullishFactors
          .filter((x: unknown) => typeof x === "string")
          .slice(0, 4)
      : [];
    const bearishFactors = Array.isArray(parsed.bearishFactors)
      ? parsed.bearishFactors
          .filter((x: unknown) => typeof x === "string")
          .slice(0, 4)
      : [];
    const risk = validRisks.includes(parsed.risk) ? parsed.risk : "medium";
    const reasoning =
      typeof parsed.reasoning === "string" && parsed.reasoning.trim().length > 0
        ? parsed.reasoning.trim()
        : "No detailed reasoning available.";
    const confidenceExplanation =
      typeof parsed.confidenceExplanation === "string" &&
      parsed.confidenceExplanation.trim().length > 0
        ? parsed.confidenceExplanation.trim()
        : "Confidence based on strength and consistency of technical signals.";

    return {
      signal,
      confidence,
      summary,
      bullishFactors,
      bearishFactors,
      risk,
      reasoning,
      confidenceExplanation,
    };
  } catch {
    return null;
  }
}

export function fallbackLLMResult(snapshot: QuantSnapshot): LLMAnalysisResult {
  const signalMap: Record<QuantSnapshot["signal"], string> = {
    strong_buy:
      "Strong bullish quant score suggests aggressive upside momentum.",
    buy: "Bullish quant score suggests potential upside.",
    hold: "Mixed or neutral quant signals; no clear directional edge.",
    sell: "Bearish quant score suggests potential downside.",
    strong_sell:
      "Strong bearish quant score suggests aggressive downside momentum.",
  };

  const risk: LLMAnalysisResult["risk"] =
    snapshot.scores.volatilityRisk > 70
      ? "high"
      : snapshot.scores.volatilityRisk > 45
        ? "medium"
        : "low";

  return {
    signal: snapshot.signal,
    confidence: snapshot.confidence,
    summary:
      signalMap[snapshot.signal] || "Quant engine produced a neutral signal.",
    bullishFactors:
      snapshot.scores.composite > 55 ? ["Composite score above neutral"] : [],
    bearishFactors:
      snapshot.scores.composite < 45 ? ["Composite score below neutral"] : [],
    risk,
    reasoning: `Quant composite score is ${snapshot.scores.composite.toFixed(1)}. Momentum ${snapshot.scores.momentum.toFixed(1)}, trend ${snapshot.scores.trend.toFixed(1)}, volume ${snapshot.scores.volume.toFixed(1)}.`,
    confidenceExplanation: `Confidence reflects the distance of the composite score (${snapshot.scores.composite.toFixed(1)}) from neutral (50).`,
  };
}

export async function analyzeWithLLM(
  snapshot: QuantSnapshot,
): Promise<LLMAnalysisResult> {
  const config = getLLMConfig();

  if (!config.enabled) {
    return fallbackLLMResult(snapshot);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

    const response = await fetch(`${config.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.model,
        prompt: buildPrompt(snapshot),
        stream: false,
        format: "json",
        options: {
          temperature: 0.3,
          num_predict: 512,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Ollama HTTP ${response.status}`);
    }

    const data = (await response.json()) as { response?: string };
    const parsed = parseLLMResponse(data.response || "");

    if (!parsed) {
      throw new Error("Failed to parse LLM response");
    }

    return parsed;
  } catch (error) {
    console.error("[LLM analysis error]", error);
    return fallbackLLMResult(snapshot);
  }
}
