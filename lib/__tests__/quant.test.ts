import { describe, it, expect } from "vitest";
import {
  sma,
  ema,
  rsi,
  macd,
  bollingerBands,
  atr,
  vwap,
  obv,
  cmf,
  mfi,
  williamsR,
  roc,
  momentum,
  historicalVolatility,
  sharpe,
  computeQuantSnapshot,
} from "../quant";

const closes = Array.from({ length: 60 }, (_, i) => {
  const base = 10 + i * 0.1;
  const noise = Math.sin(i * 0.5) * 2;
  return base + noise;
});
const highs = closes.map((c) => c + 0.5);
const lows = closes.map((c) => c - 0.5);
const volumes = Array.from({ length: closes.length }, (_, i) => 1000 + i * 10);

const ohlc: OHLCData[] = closes.map((c, i) => [
  i * 86400,
  c,
  highs[i],
  lows[i],
  c,
  volumes[i],
]);

const coin = {
  id: "test-coin",
  symbol: "TST",
  name: "Test Coin",
  image: "",
  current_price: 16,
  market_cap: 1000000,
  market_cap_rank: 1,
  fully_diluted_valuation: 1000000,
  total_volume: 10000,
  high_24h: 16.5,
  low_24h: 15.5,
  price_change_24h: 1,
  price_change_percentage_24h: 6.67,
  market_cap_change_24h: 0,
  market_cap_change_percentage_24h: 0,
  circulating_supply: 100000,
  total_supply: 100000,
  max_supply: 100000,
  ath: 20,
  ath_change_percentage: -20,
  ath_date: "",
  atl: 1,
  atl_change_percentage: 1500,
  atl_date: "",
  last_updated: "",
} as CoinMarketData;

describe("quant indicators", () => {
  it("computes SMA", () => {
    expect(sma([1, 2, 3, 4, 5], 5)).toBe(3);
    expect(sma([1, 2], 5)).toBeNull();
  });

  it("computes EMA", () => {
    const value = ema([1, 2, 3, 4, 5], 5);
    expect(value).not.toBeNull();
    expect(value).toBeGreaterThan(0);
  });

  it("computes RSI", () => {
    const value = rsi(closes, 14);
    expect(value).not.toBeNull();
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(100);
  });

  it("computes MACD", () => {
    const result = macd(closes, 12, 26, 9);
    expect(result.line).not.toBeNull();
    expect(result.signal).not.toBeNull();
    expect(result.histogram).not.toBeNull();
  });

  it("computes Bollinger Bands", () => {
    const result = bollingerBands(closes, 20, 2);
    expect(result.upper).not.toBeNull();
    expect(result.lower).not.toBeNull();
    expect(result.upper! > result.lower!).toBe(true);
  });

  it("computes ATR", () => {
    const value = atr(highs, lows, closes, 14);
    expect(value).not.toBeNull();
    expect(value).toBeGreaterThan(0);
  });

  it("computes VWAP", () => {
    const value = vwap(highs, lows, closes, volumes);
    expect(value).not.toBeNull();
    expect(value).toBeGreaterThan(0);
  });

  it("computes OBV", () => {
    const value = obv(closes, volumes);
    expect(value).not.toBeNull();
  });

  it("computes CMF", () => {
    const value = cmf(highs, lows, closes, volumes, 20);
    expect(value).not.toBeNull();
  });

  it("computes MFI", () => {
    const value = mfi(highs, lows, closes, volumes, 14);
    expect(value).not.toBeNull();
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(100);
  });

  it("computes Williams %R", () => {
    const value = williamsR(highs, lows, closes, 14);
    expect(value).not.toBeNull();
  });

  it("computes ROC", () => {
    const value = roc(closes, 10);
    expect(value).not.toBeNull();
  });

  it("computes momentum", () => {
    const value = momentum(closes, 10);
    expect(value).not.toBeNull();
  });

  it("computes historical volatility", () => {
    const value = historicalVolatility(closes, 20);
    expect(value).not.toBeNull();
    expect(value).toBeGreaterThan(0);
  });

  it("computes Sharpe", () => {
    const value = sharpe(closes, 20);
    expect(value).not.toBeNull();
  });
});

describe("computeQuantSnapshot", () => {
  it("returns a valid snapshot with signal and confidence", () => {
    const snapshot = computeQuantSnapshot(coin, ohlc);
    expect(snapshot.coinId).toBe("test-coin");
    expect(snapshot.signal).toMatch(/^(strong_buy|buy|hold|sell|strong_sell)$/);
    expect(snapshot.confidence).toBeGreaterThanOrEqual(0);
    expect(snapshot.confidence).toBeLessThanOrEqual(100);
    expect(snapshot.scores.composite).toBeGreaterThanOrEqual(0);
    expect(snapshot.scores.composite).toBeLessThanOrEqual(100);
    expect(snapshot.indicators.rsi14).not.toBeNull();
  });
});
