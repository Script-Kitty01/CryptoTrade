export type QuantSignal =
  | "strong_buy"
  | "buy"
  | "hold"
  | "sell"
  | "strong_sell";

export interface QuantSnapshot {
  coinId: string;
  symbol: string;
  name: string;
  price: number;
  timestamp: number;
  signal: QuantSignal;
  confidence: number; // 0-100
  indicators: {
    sma20: number | null;
    sma50: number | null;
    ema12: number | null;
    ema26: number | null;
    rsi14: number | null;
    stochRsiK: number | null;
    stochRsiD: number | null;
    macdLine: number | null;
    macdSignal: number | null;
    macdHistogram: number | null;
    bbUpper: number | null;
    bbLower: number | null;
    bbWidth: number | null;
    atr14: number | null;
    adx14: number | null;
    vwap: number | null;
    obv: number | null;
    cmf20: number | null;
    mfi14: number | null;
    williamsR14: number | null;
    roc10: number | null;
    momentum10: number | null;
    volatility20: number | null;
    sharpe20: number | null;
    volumeTrend: "rising" | "falling" | "flat" | null;
  };
  features: {
    priceToSma20: number | null;
    priceToSma50: number | null;
    priceToEma200: number | null;
    priceToBbUpper: number | null;
    priceToBbLower: number | null;
    rsiTrend: "rising" | "falling" | "flat" | null;
    rsiDivergence: "bullish" | "bearish" | "none" | null;
    macdCross: "bullish" | "bearish" | "none" | null;
    volumeSpike: boolean;
    atrExpansion: boolean;
  };
  scores: {
    momentum: number;
    trend: number;
    meanReversion: number;
    volume: number;
    volatilityRisk: number;
    composite: number;
  };
  raw: {
    closes: number[];
    highs: number[];
    lows: number[];
    volumes: number[];
  };
}

export function sma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

export function ema(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const k = 2 / (period + 1);
  let result = values[0];
  for (let i = 1; i < values.length; i += 1) {
    result = values[i] * k + result * (1 - k);
  }
  return result;
}

export function rsi(values: number[], period = 14): number | null {
  if (values.length < period + 1) return null;
  let gain = 0;
  let loss = 0;
  for (let i = values.length - period; i < values.length; i += 1) {
    const change = values[i] - values[i - 1];
    if (change > 0) gain += change;
    else loss -= change;
  }
  if (loss === 0) return 100;
  const rs = gain / loss;
  return 100 - 100 / (1 + rs);
}

export function stochRsi(
  values: number[],
  period = 14,
  kPeriod = 3,
  dPeriod = 3,
): { k: number | null; d: number | null } {
  if (values.length < period + kPeriod + dPeriod) return { k: null, d: null };
  const rsiValues: number[] = [];
  for (let i = period + 1; i <= values.length; i += 1) {
    const r = rsi(values.slice(0, i), period);
    if (r !== null) rsiValues.push(r);
  }
  if (rsiValues.length < kPeriod + dPeriod - 1) return { k: null, d: null };
  const kValues: number[] = [];
  for (let i = kPeriod; i <= rsiValues.length; i += 1) {
    const slice = rsiValues.slice(i - kPeriod, i);
    const min = Math.min(...slice);
    const max = Math.max(...slice);
    const current = rsiValues[i - 1];
    kValues.push(max === min ? 50 : ((current - min) / (max - min)) * 100);
  }
  const k = kValues[kValues.length - 1];
  const dSlice = kValues.slice(-dPeriod);
  const d = dSlice.reduce((a, b) => a + b, 0) / dPeriod;
  return { k, d };
}

export function macd(
  values: number[],
  fast = 12,
  slow = 26,
  signal = 9,
): { line: number | null; signal: number | null; histogram: number | null } {
  const fastEma = ema(values, fast);
  const slowEma = ema(values, slow);
  if (fastEma === null || slowEma === null)
    return { line: null, signal: null, histogram: null };
  const line = fastEma - slowEma;
  const lineSeries: number[] = [];
  for (let i = slow + 1; i <= values.length; i += 1) {
    const f = ema(values.slice(0, i), fast);
    const s = ema(values.slice(0, i), slow);
    if (f !== null && s !== null) lineSeries.push(f - s);
  }
  const signalLine = ema(lineSeries, signal);
  return {
    line,
    signal: signalLine,
    histogram: signalLine !== null ? line - signalLine : null,
  };
}

export function bollingerBands(
  values: number[],
  period = 20,
  multiplier = 2,
): { upper: number | null; lower: number | null; width: number | null } {
  const middle = sma(values, period);
  if (middle === null) return { upper: null, lower: null, width: null };
  const slice = values.slice(-period);
  const variance =
    slice.reduce((sum, v) => sum + (v - middle) ** 2, 0) / period;
  const stdDev = Math.sqrt(variance);
  const upper = middle + multiplier * stdDev;
  const lower = middle - multiplier * stdDev;
  return {
    upper,
    lower,
    width: middle === 0 ? null : ((upper - lower) / middle) * 100,
  };
}

export function atr(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 14,
): number | null {
  if (highs.length < period + 1 || lows.length < period + 1) return null;
  const trs: number[] = [];
  for (
    let i = Math.max(1, highs.length - period - 1);
    i < highs.length;
    i += 1
  ) {
    const tr1 = highs[i] - lows[i];
    const tr2 = Math.abs(highs[i] - closes[i - 1]);
    const tr3 = Math.abs(lows[i] - closes[i - 1]);
    trs.push(Math.max(tr1, tr2, tr3));
  }
  if (trs.length === 0) return null;
  return trs.reduce((a, b) => a + b, 0) / trs.length;
}

export function adx(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 14,
): number | null {
  if (highs.length < period * 2 + 1) return null;
  const plusDM: number[] = [];
  const minusDM: number[] = [];
  const trs: number[] = [];
  for (let i = highs.length - period * 2; i < highs.length; i += 1) {
    const upMove = highs[i] - highs[i - 1];
    const downMove = lows[i - 1] - lows[i];
    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    const tr1 = highs[i] - lows[i];
    const tr2 = Math.abs(highs[i] - closes[i - 1]);
    const tr3 = Math.abs(lows[i] - closes[i - 1]);
    trs.push(Math.max(tr1, tr2, tr3));
  }
  const atrValue = trs.reduce((a, b) => a + b, 0) / period;
  if (atrValue === 0) return null;
  const smooth = (arr: number[]) => {
    let sum = arr.slice(0, period).reduce((a, b) => a + b, 0);
    const out = [sum];
    for (let i = period; i < arr.length; i += 1) {
      sum = sum - sum / period + arr[i];
      out.push(sum);
    }
    return out;
  };
  const smoothedPlus = smooth(plusDM);
  const smoothedMinus = smooth(minusDM);
  const smoothedTr = smooth(trs);
  const dxValues: number[] = [];
  for (let i = 0; i < smoothedTr.length; i += 1) {
    const plusDI = (smoothedPlus[i] / smoothedTr[i]) * 100;
    const minusDI = (smoothedMinus[i] / smoothedTr[i]) * 100;
    const dx =
      Math.abs(plusDI + minusDI) === 0
        ? 0
        : (Math.abs(plusDI - minusDI) / Math.abs(plusDI + minusDI)) * 100;
    dxValues.push(dx);
  }
  return sma(dxValues, period);
}

export function vwap(
  highs: number[],
  lows: number[],
  closes: number[],
  volumes: number[],
): number | null {
  if (closes.length !== volumes.length || closes.length === 0) return null;
  let cumulativeTPV = 0;
  let cumulativeVolume = 0;
  for (let i = 0; i < closes.length; i += 1) {
    const tp = (highs[i] + lows[i] + closes[i]) / 3;
    cumulativeTPV += tp * volumes[i];
    cumulativeVolume += volumes[i];
  }
  return cumulativeVolume === 0 ? null : cumulativeTPV / cumulativeVolume;
}

export function obv(closes: number[], volumes: number[]): number | null {
  if (closes.length !== volumes.length || closes.length < 2) return null;
  let obvValue = 0;
  for (let i = 1; i < closes.length; i += 1) {
    if (closes[i] > closes[i - 1]) obvValue += volumes[i];
    else if (closes[i] < closes[i - 1]) obvValue -= volumes[i];
  }
  return obvValue;
}

export function cmf(
  highs: number[],
  lows: number[],
  closes: number[],
  volumes: number[],
  period = 20,
): number | null {
  if (closes.length < period) return null;
  let sumMoneyFlowVolume = 0;
  let sumVolume = 0;
  for (let i = closes.length - period; i < closes.length; i += 1) {
    const mfv =
      ((closes[i] - lows[i] - (highs[i] - closes[i])) /
        (highs[i] - lows[i] || 1)) *
      volumes[i];
    sumMoneyFlowVolume += mfv;
    sumVolume += volumes[i];
  }
  return sumVolume === 0 ? null : sumMoneyFlowVolume / sumVolume;
}

export function mfi(
  highs: number[],
  lows: number[],
  closes: number[],
  volumes: number[],
  period = 14,
): number | null {
  if (closes.length < period + 1) return null;
  const typicalPrices: number[] = [];
  for (let i = 0; i < closes.length; i += 1) {
    typicalPrices.push((highs[i] + lows[i] + closes[i]) / 3);
  }
  let positive = 0;
  let negative = 0;
  for (
    let i = typicalPrices.length - period;
    i < typicalPrices.length;
    i += 1
  ) {
    const rawMoney = typicalPrices[i] * volumes[i];
    if (typicalPrices[i] > typicalPrices[i - 1]) positive += rawMoney;
    else negative += rawMoney;
  }
  if (negative === 0) return 100;
  const mfr = positive / negative;
  return 100 - 100 / (1 + mfr);
}

export function williamsR(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 14,
): number | null {
  if (closes.length < period) return null;
  const highest = Math.max(...highs.slice(-period));
  const lowest = Math.min(...lows.slice(-period));
  const range = highest - lowest;
  return range === 0
    ? null
    : ((highest - closes[closes.length - 1]) / range) * -100;
}

export function roc(values: number[], period = 10): number | null {
  if (values.length < period + 1) return null;
  const current = values[values.length - 1];
  const past = values[values.length - 1 - period];
  return past === 0 ? null : ((current - past) / past) * 100;
}

export function momentum(values: number[], period = 10): number | null {
  if (values.length < period + 1) return null;
  return values[values.length - 1] - values[values.length - 1 - period];
}

export function historicalVolatility(
  values: number[],
  period = 20,
): number | null {
  if (values.length < period + 1) return null;
  const returns: number[] = [];
  for (let i = values.length - period; i < values.length; i += 1) {
    returns.push(Math.log(values[i] / values[i - 1]));
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance) * Math.sqrt(period) * 100;
}

export function sharpe(
  values: number[],
  period = 20,
  riskFree = 0,
): number | null {
  if (values.length < period + 1) return null;
  const returns: number[] = [];
  for (let i = values.length - period; i < values.length; i += 1) {
    returns.push((values[i] - values[i - 1]) / values[i - 1]);
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length - riskFree;
  const std = Math.sqrt(
    returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / returns.length,
  );
  return std === 0 ? null : mean / std;
}

export function volumeTrend(
  volumes: number[],
): QuantSnapshot["indicators"]["volumeTrend"] {
  if (volumes.length < 10) return null;
  const recent = sma(volumes, 5) ?? 0;
  const older = sma(volumes.slice(0, volumes.length - 5), 5) ?? 0;
  if (older === 0) return "flat";
  const ratio = recent / older;
  if (ratio > 1.15) return "rising";
  if (ratio < 0.85) return "falling";
  return "flat";
}

function detectRsiDivergence(
  closes: number[],
  rsiValues: number[],
): QuantSnapshot["features"]["rsiDivergence"] {
  if (closes.length < 20 || rsiValues.length < 20) return "none";
  const recentCloses = closes.slice(-10);
  const recentRsi = rsiValues.slice(-10);
  const olderCloses = closes.slice(-20, -10);
  const olderRsi = rsiValues.slice(-20, -10);
  const recentLow = Math.min(...recentCloses);
  const olderLow = Math.min(...olderCloses);
  const recentRsiLow = Math.min(...recentRsi);
  const olderRsiLow = Math.min(...olderRsi);
  if (recentLow < olderLow && recentRsiLow > olderRsiLow) return "bullish";
  const recentHigh = Math.max(...recentCloses);
  const olderHigh = Math.max(...olderCloses);
  const recentRsiHigh = Math.max(...recentRsi);
  const olderRsiHigh = Math.max(...olderRsi);
  if (recentHigh > olderHigh && recentRsiHigh < olderRsiHigh) return "bearish";
  return "none";
}

function computeScores(
  snapshot: Omit<QuantSnapshot, "scores" | "signal" | "confidence">,
): QuantSnapshot["scores"] {
  const { indicators, features } = snapshot;
  const price = snapshot.price;

  let momentum = 0;
  if (indicators.rsi14 !== null) {
    if (indicators.rsi14 > 70) momentum += 30;
    else if (indicators.rsi14 > 55) momentum += 60;
    else if (indicators.rsi14 > 45) momentum += 50;
    else if (indicators.rsi14 > 30) momentum += 40;
    else momentum += 20;
  }
  if (indicators.macdHistogram !== null) {
    momentum += indicators.macdHistogram > 0 ? 20 : -20;
  }
  if (indicators.roc10 !== null) {
    momentum += Math.max(-20, Math.min(20, indicators.roc10 / 2));
  }
  momentum = Math.max(0, Math.min(100, momentum + 50));

  let trend = 50;
  if (features.priceToSma20 !== null) {
    trend += features.priceToSma20 > 0 ? 15 : -15;
  }
  if (features.priceToSma50 !== null) {
    trend += features.priceToSma50 > 0 ? 15 : -15;
  }
  if (features.macdCross === "bullish") trend += 15;
  if (features.macdCross === "bearish") trend -= 15;
  trend = Math.max(0, Math.min(100, trend));

  let meanReversion = 50;
  if (features.priceToBbUpper !== null && features.priceToBbUpper > 0) {
    meanReversion -= Math.min(30, features.priceToBbUpper * 2);
  }
  if (features.priceToBbLower !== null && features.priceToBbLower < 0) {
    meanReversion += Math.min(30, Math.abs(features.priceToBbLower) * 2);
  }
  if (indicators.williamsR14 !== null) {
    if (indicators.williamsR14 < -80) meanReversion += 15;
    if (indicators.williamsR14 > -20) meanReversion -= 15;
  }
  meanReversion = Math.max(0, Math.min(100, meanReversion));

  let volume = 50;
  if (indicators.volumeTrend === "rising") volume += 25;
  if (indicators.volumeTrend === "falling") volume -= 15;
  if (features.volumeSpike) volume += 15;
  if (indicators.cmf20 !== null) {
    volume += Math.max(-15, Math.min(15, indicators.cmf20 * 15));
  }
  if (indicators.mfi14 !== null) {
    if (indicators.mfi14 > 70) volume -= 10;
    if (indicators.mfi14 < 30) volume += 10;
  }
  volume = Math.max(0, Math.min(100, volume));

  let volatilityRisk = 50;
  if (indicators.volatility20 !== null) {
    volatilityRisk += Math.min(30, indicators.volatility20 / 2);
  }
  if (indicators.atr14 !== null && price > 0) {
    volatilityRisk += Math.min(20, (indicators.atr14 / price) * 100 * 5);
  }
  if (features.atrExpansion) volatilityRisk += 10;
  volatilityRisk = Math.max(0, Math.min(100, volatilityRisk));

  const composite =
    momentum * 0.25 +
    trend * 0.3 +
    meanReversion * 0.15 +
    volume * 0.15 +
    (100 - volatilityRisk) * 0.05;

  return {
    momentum,
    trend,
    meanReversion,
    volume,
    volatilityRisk,
    composite,
  };
}

export function computeQuantSnapshot(
  coin: CoinMarketData | CoinDetailsData,
  ohlc: OHLCData[],
): QuantSnapshot {
  const closes = ohlc.map((c) => c[4]);
  const highs = ohlc.map((c) => c[2]);
  const lows = ohlc.map((c) => c[3]);
  const volumes = ohlc.map((c) => c[5] ?? 0);
  const price =
    closes[closes.length - 1] ??
    ("current_price" in coin ? coin.current_price : coin.market_data.current_price.usd);

  const rsi14 = rsi(closes, 14);
  const rsiValues: number[] = [];
  for (let i = 15; i <= closes.length; i += 1) {
    const r = rsi(closes.slice(0, i), 14);
    if (r !== null) rsiValues.push(r);
  }

  const stoch = stochRsi(closes, 14, 3, 3);
  const macdResult = macd(closes, 12, 26, 9);
  const bb = bollingerBands(closes, 20, 2);
  const atr14 = atr(highs, lows, closes, 14);
  const adx14 = adx(highs, lows, closes, 14);
  const vwapValue = vwap(highs, lows, closes, volumes);
  const obvValue = obv(closes, volumes);
  const cmf20 = cmf(highs, lows, closes, volumes, 20);
  const mfi14 = mfi(highs, lows, closes, volumes, 14);
  const williamsR14 = williamsR(highs, lows, closes, 14);
  const roc10 = roc(closes, 10);
  const momentum10 = momentum(closes, 10);
  const volatility20 = historicalVolatility(closes, 20);
  const sharpe20 = sharpe(closes, 20);
  const volTrend = volumeTrend(volumes);

  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const ema200 = ema(closes, 200);

  const priceToSma20 =
    sma20 !== null && sma20 !== 0 ? (price - sma20) / sma20 : null;
  const priceToSma50 =
    sma50 !== null && sma50 !== 0 ? (price - sma50) / sma50 : null;
  const priceToEma200 =
    ema200 !== null && ema200 !== 0 ? (price - ema200) / ema200 : null;
  const priceToBbUpper =
    bb.upper !== null && bb.upper !== 0 ? (price - bb.upper) / bb.upper : null;
  const priceToBbLower =
    bb.lower !== null && bb.lower !== 0 ? (price - bb.lower) / bb.lower : null;

  const rsiTrend: QuantSnapshot["features"]["rsiTrend"] =
    rsiValues.length < 6
      ? null
      : rsiValues[rsiValues.length - 1] > rsiValues[rsiValues.length - 6]
        ? "rising"
        : rsiValues[rsiValues.length - 1] < rsiValues[rsiValues.length - 6]
          ? "falling"
          : "flat";

  const rsiDivergence = detectRsiDivergence(closes, rsiValues);

  let macdCross: QuantSnapshot["features"]["macdCross"] = "none";
  if (macdResult.line !== null && macdResult.signal !== null) {
    const prevLine =
      ema(closes.slice(0, closes.length - 1), 12)! -
      ema(closes.slice(0, closes.length - 1), 26)!;
    const prevSignal = ema(
      Array.from({ length: closes.length - 26 }, (_, i) => {
        const f = ema(closes.slice(0, i + 27), 12)!;
        const s = ema(closes.slice(0, i + 27), 26)!;
        return f - s;
      }),
      9,
    );
    if (prevSignal !== null) {
      if (prevLine < prevSignal && macdResult.line > macdResult.signal)
        macdCross = "bullish";
      else if (prevLine > prevSignal && macdResult.line < macdResult.signal)
        macdCross = "bearish";
    }
  }

  const recentVolume = sma(volumes, 5) ?? 0;
  const olderVolume =
    sma(volumes.slice(0, Math.max(0, volumes.length - 5)), 5) ?? 0;
  const volumeSpike = olderVolume > 0 && recentVolume / olderVolume > 1.5;

  const recentAtr = atr(
    highs.slice(-15),
    lows.slice(-15),
    closes.slice(-15),
    14,
  );
  const olderAtr = atr(
    highs.slice(-30, -15),
    lows.slice(-30, -15),
    closes.slice(-30, -15),
    14,
  );
  const atrExpansion =
    recentAtr !== null && olderAtr !== null && recentAtr > olderAtr * 1.3;

  const base: Omit<QuantSnapshot, "scores" | "signal" | "confidence"> = {
    coinId: coin.id,
    symbol: coin.symbol,
    name: coin.name,
    price,
    timestamp: Date.now(),
    indicators: {
      sma20,
      sma50,
      ema12,
      ema26,
      rsi14,
      stochRsiK: stoch.k,
      stochRsiD: stoch.d,
      macdLine: macdResult.line,
      macdSignal: macdResult.signal,
      macdHistogram: macdResult.histogram,
      bbUpper: bb.upper,
      bbLower: bb.lower,
      bbWidth: bb.width,
      atr14,
      adx14,
      vwap: vwapValue,
      obv: obvValue,
      cmf20,
      mfi14,
      williamsR14,
      roc10,
      momentum10,
      volatility20,
      sharpe20,
      volumeTrend: volTrend,
    },
    features: {
      priceToSma20,
      priceToSma50,
      priceToEma200,
      priceToBbUpper,
      priceToBbLower,
      rsiTrend,
      rsiDivergence,
      macdCross,
      volumeSpike,
      atrExpansion,
    },
    raw: { closes, highs, lows, volumes },
  };

  const scores = computeScores(base);

  let signal: QuantSignal = "hold";
  if (scores.composite >= 70) signal = "strong_buy";
  else if (scores.composite >= 58) signal = "buy";
  else if (scores.composite <= 30) signal = "strong_sell";
  else if (scores.composite <= 42) signal = "sell";

  const confidence = Math.round(
    Math.min(100, Math.max(0, Math.abs(scores.composite - 50) * 1.8 + 20)),
  );

  return { ...base, scores, signal, confidence };
}

export function rankSnapshots(snapshots: QuantSnapshot[]): QuantSnapshot[] {
  return [...snapshots].sort((a, b) => b.scores.composite - a.scores.composite);
}
