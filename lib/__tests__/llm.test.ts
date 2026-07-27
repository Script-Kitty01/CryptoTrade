import { describe, it, expect } from "vitest";
import {
  parseLLMResponse,
  fallbackLLMResult,
  buildPrompt,
  getLLMConfig,
} from "../llm";
import { QuantSnapshot } from "../quant";

const baseSnapshot: QuantSnapshot = {
  coinId: "bitcoin",
  symbol: "btc",
  name: "Bitcoin",
  price: 95000,
  timestamp: Date.now(),
  signal: "buy",
  confidence: 72,
  indicators: {
    sma20: 94000,
    sma50: 90000,
    ema12: 94500,
    ema26: 93500,
    rsi14: 58,
    stochRsiK: 62,
    stochRsiD: 55,
    macdLine: 500,
    macdSignal: 400,
    macdHistogram: 100,
    bbUpper: 98000,
    bbLower: 90000,
    bbWidth: 8000,
    atr14: 1200,
    adx14: 28,
    vwap: 94500,
    obv: 1234567890,
    cmf20: 0.15,
    mfi14: 55,
    williamsR14: -35,
    roc10: 3.5,
    momentum10: 3200,
    volatility20: 2.8,
    sharpe20: 1.2,
    volumeTrend: "rising",
  },
  features: {
    priceToSma20: 0.011,
    priceToSma50: 0.056,
    priceToEma200: 0.08,
    priceToBbUpper: -0.03,
    priceToBbLower: 0.056,
    rsiTrend: "rising",
    rsiDivergence: "none",
    macdCross: "bullish",
    volumeSpike: false,
    atrExpansion: false,
  },
  scores: {
    momentum: 68,
    trend: 72,
    meanReversion: 55,
    volume: 60,
    volatilityRisk: 40,
    composite: 65,
  },
};

describe("parseLLMResponse", () => {
  it("parses a valid JSON response", () => {
    const json = JSON.stringify({
      signal: "buy",
      confidence: 75,
      summary: "Bullish momentum with strong volume support.",
      bullishFactors: ["RSI trending up", "MACD bullish cross"],
      bearishFactors: ["Near resistance"],
      risk: "medium",
      reasoning: "The coin shows strong momentum driven by volume.",
      confidenceExplanation: "Multiple indicators align on bullish direction.",
    });

    const result = parseLLMResponse(json);
    expect(result).not.toBeNull();
    expect(result!.signal).toBe("buy");
    expect(result!.confidence).toBe(75);
    expect(result!.summary).toBe(
      "Bullish momentum with strong volume support.",
    );
    expect(result!.bullishFactors).toEqual([
      "RSI trending up",
      "MACD bullish cross",
    ]);
    expect(result!.bearishFactors).toEqual(["Near resistance"]);
    expect(result!.risk).toBe("medium");
    expect(result!.reasoning).toBe(
      "The coin shows strong momentum driven by volume.",
    );
    expect(result!.confidenceExplanation).toBe(
      "Multiple indicators align on bullish direction.",
    );
  });

  it("normalizes 'neutral' signal to 'hold'", () => {
    const json = JSON.stringify({ signal: "neutral", confidence: 50 });
    const result = parseLLMResponse(json);
    expect(result!.signal).toBe("hold");
  });

  it("normalizes 'strong buy' to 'strong_buy'", () => {
    const json = JSON.stringify({ signal: "strong buy", confidence: 85 });
    const result = parseLLMResponse(json);
    expect(result!.signal).toBe("strong_buy");
  });

  it("normalizes 'strong sell' to 'strong_sell'", () => {
    const json = JSON.stringify({ signal: "strong sell", confidence: 90 });
    const result = parseLLMResponse(json);
    expect(result!.signal).toBe("strong_sell");
  });

  it("defaults unknown signal to 'hold'", () => {
    const json = JSON.stringify({ signal: "garbage", confidence: 50 });
    const result = parseLLMResponse(json);
    expect(result!.signal).toBe("hold");
  });

  it("clamps confidence to 0-100", () => {
    const high = JSON.stringify({ signal: "buy", confidence: 150 });
    const low = JSON.stringify({ signal: "sell", confidence: -20 });
    expect(parseLLMResponse(high)!.confidence).toBe(100);
    expect(parseLLMResponse(low)!.confidence).toBe(0);
  });

  it("rounds confidence to integer", () => {
    const json = JSON.stringify({ signal: "buy", confidence: 72.7 });
    expect(parseLLMResponse(json)!.confidence).toBe(73);
  });

  it("defaults missing confidence to 50", () => {
    const json = JSON.stringify({ signal: "hold" });
    expect(parseLLMResponse(json)!.confidence).toBe(50);
  });

  it("defaults missing summary", () => {
    const json = JSON.stringify({ signal: "buy", confidence: 70 });
    expect(parseLLMResponse(json)!.summary).toBe("No summary available.");
  });

  it("defaults missing risk to 'medium'", () => {
    const json = JSON.stringify({ signal: "buy", confidence: 70 });
    expect(parseLLMResponse(json)!.risk).toBe("medium");
  });

  it("defaults invalid risk to 'medium'", () => {
    const json = JSON.stringify({
      signal: "buy",
      confidence: 70,
      risk: "extreme",
    });
    expect(parseLLMResponse(json)!.risk).toBe("medium");
  });

  it("filters non-string bullish factors", () => {
    const json = JSON.stringify({
      signal: "buy",
      confidence: 70,
      bullishFactors: ["good rsi", 123, null, "volume up"],
    });
    const result = parseLLMResponse(json)!;
    expect(result.bullishFactors).toEqual(["good rsi", "volume up"]);
  });

  it("caps bullish/bearish factors at 4", () => {
    const json = JSON.stringify({
      signal: "buy",
      confidence: 70,
      bullishFactors: ["a", "b", "c", "d", "e", "f"],
      bearishFactors: ["x", "y", "z", "w", "v"],
    });
    const result = parseLLMResponse(json)!;
    expect(result.bullishFactors).toHaveLength(4);
    expect(result.bearishFactors).toHaveLength(4);
  });

  it("handles JSON wrapped in markdown code fences", () => {
    const text = '```json\n{"signal":"buy","confidence":80}\n```';
    const result = parseLLMResponse(text);
    expect(result).not.toBeNull();
    expect(result!.signal).toBe("buy");
    expect(result!.confidence).toBe(80);
  });

  it("handles JSON with surrounding text", () => {
    const text =
      'Here is the analysis: {"signal":"sell","confidence":35} Hope this helps!';
    const result = parseLLMResponse(text);
    expect(result).not.toBeNull();
    expect(result!.signal).toBe("sell");
    expect(result!.confidence).toBe(35);
  });

  it("returns null for completely invalid input", () => {
    expect(parseLLMResponse("not json at all")).toBeNull();
    expect(parseLLMResponse("")).toBeNull();
  });

  it("returns defaults for empty braces (valid JSON, no signal)", () => {
    const result = parseLLMResponse("{}");
    expect(result).not.toBeNull();
    expect(result!.signal).toBe("hold");
    expect(result!.confidence).toBe(50);
  });

  it("handles empty arrays for factors", () => {
    const json = JSON.stringify({
      signal: "hold",
      confidence: 50,
      bullishFactors: [],
      bearishFactors: [],
    });
    const result = parseLLMResponse(json)!;
    expect(result.bullishFactors).toEqual([]);
    expect(result.bearishFactors).toEqual([]);
  });

  it("defaults missing reasoning", () => {
    const json = JSON.stringify({ signal: "buy", confidence: 70 });
    expect(parseLLMResponse(json)!.reasoning).toBe(
      "No detailed reasoning available.",
    );
  });

  it("defaults missing confidenceExplanation", () => {
    const json = JSON.stringify({ signal: "buy", confidence: 70 });
    expect(parseLLMResponse(json)!.confidenceExplanation).toBe(
      "Confidence based on strength and consistency of technical signals.",
    );
  });
});

describe("fallbackLLMResult", () => {
  it("returns the quant signal", () => {
    const result = fallbackLLMResult(baseSnapshot);
    expect(result.signal).toBe("buy");
  });

  it("returns the quant confidence", () => {
    const result = fallbackLLMResult(baseSnapshot);
    expect(result.confidence).toBe(72);
  });

  it("maps strong_buy to a descriptive summary", () => {
    const snap = { ...baseSnapshot, signal: "strong_buy" as const };
    const result = fallbackLLMResult(snap);
    expect(result.summary).toContain("Strong bullish");
  });

  it("maps strong_sell to a descriptive summary", () => {
    const snap = { ...baseSnapshot, signal: "strong_sell" as const };
    const result = fallbackLLMResult(snap);
    expect(result.summary).toContain("Strong bearish");
  });

  it("maps hold to a descriptive summary", () => {
    const snap = { ...baseSnapshot, signal: "hold" as const };
    const result = fallbackLLMResult(snap);
    expect(result.summary).toContain("Mixed");
  });

  it("sets risk based on volatilityRisk score", () => {
    const high = {
      ...baseSnapshot,
      scores: { ...baseSnapshot.scores, volatilityRisk: 80 },
    };
    const med = {
      ...baseSnapshot,
      scores: { ...baseSnapshot.scores, volatilityRisk: 50 },
    };
    const low = {
      ...baseSnapshot,
      scores: { ...baseSnapshot.scores, volatilityRisk: 30 },
    };
    expect(fallbackLLMResult(high).risk).toBe("high");
    expect(fallbackLLMResult(med).risk).toBe("medium");
    expect(fallbackLLMResult(low).risk).toBe("low");
  });

  it("includes composite score in reasoning", () => {
    const result = fallbackLLMResult(baseSnapshot);
    expect(result.reasoning).toContain("65.0");
  });

  it("includes bullish factor when composite > 55", () => {
    const result = fallbackLLMResult(baseSnapshot);
    expect(result.bullishFactors.length).toBeGreaterThan(0);
  });

  it("includes bearish factor when composite < 45", () => {
    const snap = {
      ...baseSnapshot,
      scores: { ...baseSnapshot.scores, composite: 30 },
    };
    const result = fallbackLLMResult(snap);
    expect(result.bearishFactors.length).toBeGreaterThan(0);
  });
});

describe("buildPrompt", () => {
  it("includes coin name and symbol", () => {
    const prompt = buildPrompt(baseSnapshot);
    expect(prompt).toContain("Bitcoin");
    expect(prompt).toContain("btc");
  });

  it("includes price (locale-formatted)", () => {
    const prompt = buildPrompt(baseSnapshot);
    // fmt() uses toLocaleString, so 95000 becomes "95,000.0000"
    expect(prompt).toMatch(/Price: \$[\d,]+\.\d{4}/);
  });

  it("includes quant signal and confidence", () => {
    const prompt = buildPrompt(baseSnapshot);
    expect(prompt).toContain("buy");
    expect(prompt).toContain("72%");
  });

  it("includes RSI value", () => {
    const prompt = buildPrompt(baseSnapshot);
    expect(prompt).toContain("58");
  });

  it("includes sub-scores", () => {
    const prompt = buildPrompt(baseSnapshot);
    expect(prompt).toContain("Momentum:");
    expect(prompt).toContain("Trend:");
    expect(prompt).toContain("Composite:");
  });

  it("handles null indicator values gracefully", () => {
    const snap = {
      ...baseSnapshot,
      indicators: {
        ...baseSnapshot.indicators,
        rsi14: null,
        macdHistogram: null,
      },
    };
    const prompt = buildPrompt(snap);
    expect(prompt).toContain("n/a");
  });
});

describe("getLLMConfig", () => {
  it("returns default config when env vars are not set", () => {
    const config = getLLMConfig();
    expect(config.model).toBeDefined();
    expect(config.baseUrl).toBeDefined();
    expect(typeof config.enabled).toBe("boolean");
    expect(config.timeoutMs).toBeGreaterThan(0);
  });
});
