"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { QuantSnapshot } from "@/lib/quant";
import { LLMAnalysisResult } from "@/lib/llm";

interface QuantPanelProps {
  snapshot?: QuantSnapshot | null;
  llm?: LLMAnalysisResult | null;
  loading?: boolean;
  error?: string | null;
  timestamp?: number | null;
}

const signalConfig: Record<
  QuantSnapshot["signal"],
  { label: string; className: string }
> = {
  strong_buy: {
    label: "Strong Buy",
    className: "bg-green-500/20 text-green-400 border-green-500/30",
  },
  buy: {
    label: "Buy",
    className: "bg-green-400/20 text-green-300 border-green-400/30",
  },
  hold: {
    label: "Hold",
    className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  },
  sell: {
    label: "Sell",
    className: "bg-red-500/20 text-red-400 border-red-500/30",
  },
  strong_sell: {
    label: "Strong Sell",
    className: "bg-red-600/20 text-red-500 border-red-600/30",
  },
};

function ConfidenceBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="w-full h-2 bg-dark-400 rounded-full overflow-hidden">
      <div
        className={cn("h-full transition-all duration-500", {
          "bg-green-500": clamped >= 70,
          "bg-green-400": clamped >= 55 && clamped < 70,
          "bg-yellow-500": clamped >= 40 && clamped < 55,
          "bg-red-500": clamped < 40,
        })}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

function IndicatorGrid({ snapshot }: { snapshot: QuantSnapshot }) {
  const items = [
    { label: "RSI(14)", value: snapshot.indicators.rsi14?.toFixed(2) ?? "-" },
    {
      label: "MACD",
      value: snapshot.indicators.macdHistogram?.toFixed(4) ?? "-",
    },
    { label: "ATR(14)", value: snapshot.indicators.atr14?.toFixed(4) ?? "-" },
    { label: "ADX(14)", value: snapshot.indicators.adx14?.toFixed(2) ?? "-" },
    {
      label: "Volatility",
      value: snapshot.indicators.volatility20
        ? `${snapshot.indicators.volatility20.toFixed(2)}%`
        : "-",
    },
    { label: "Volume", value: snapshot.indicators.volumeTrend ?? "-" },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 mt-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="bg-dark-400/40 rounded-md px-3 py-2 text-center"
        >
          <p className="text-[10px] uppercase tracking-wider text-purple-100">
            {item.label}
          </p>
          <p className="text-sm font-semibold text-white mt-0.5">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function timeSince(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export default function QuantPanel({
  snapshot,
  llm,
  loading,
  error,
  timestamp,
}: QuantPanelProps) {
  if (loading) {
    return (
      <div className="quant-panel">
        <div className="quant-panel-header">
          <h4>AI Trend Analysis</h4>
          <Badge
            variant="outline"
            className="text-purple-100 border-purple-600/50"
          >
            Analyzing...
          </Badge>
        </div>
        <div className="space-y-3">
          <div className="skeleton h-4 w-3/4 rounded" />
          <div className="skeleton h-2 w-full rounded" />
          <div className="skeleton h-2 w-2/3 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="quant-panel">
        <div className="quant-panel-header">
          <h4>AI Trend Analysis</h4>
          <Badge variant="outline" className="text-red-400 border-red-500/30">
            Error
          </Badge>
        </div>
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  if (!snapshot) {
    return null;
  }

  const signal = llm?.signal ?? snapshot.signal;
  const confidence = llm?.confidence ?? snapshot.confidence;
  const summary =
    llm?.summary ??
    `Quant signal: ${signalConfig[signal].label} (${snapshot.confidence}% confidence)`;
  const config = signalConfig[signal];

  return (
    <div className="quant-panel">
      <div className="quant-panel-header">
        <h4>AI Trend Analysis</h4>
        <div className="flex items-center gap-2">
          {timestamp && (
            <span className="text-[11px] text-purple-100/60">
              {timeSince(timestamp)}
            </span>
          )}
          <Badge variant="outline" className={config.className}>
            {config.label}
          </Badge>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-sm text-purple-100">Confidence</span>
            <span className="text-sm font-semibold text-white">
              {confidence}%
            </span>
          </div>
          <ConfidenceBar value={confidence} />
        </div>

        <p className="text-sm text-purple-100 leading-relaxed">{summary}</p>

        {llm && (
          <div className="space-y-3">
            {llm.bullishFactors.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wider text-green-400 mb-1.5">
                  Bullish factors
                </p>
                <ul className="text-sm text-purple-100 space-y-1">
                  {llm.bullishFactors.map((factor, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-green-400">+</span>
                      {factor}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {llm.bearishFactors.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wider text-red-400 mb-1.5">
                  Bearish factors
                </p>
                <ul className="text-sm text-purple-100 space-y-1">
                  {llm.bearishFactors.map((factor, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-red-400">−</span>
                      {factor}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Reasoning section */}
            {llm.reasoning && llm.reasoning !== "No detailed reasoning available." && (
              <div className="bg-dark-400/40 rounded-md px-3 py-2.5">
                <p className="text-xs uppercase tracking-wider text-purple-100 mb-1">
                  Reasoning
                </p>
                <p className="text-sm text-purple-100 leading-relaxed">
                  {llm.reasoning}
                </p>
              </div>
            )}

            {/* Confidence explanation */}
            {llm.confidenceExplanation &&
              llm.confidenceExplanation !==
                "Confidence based on strength and consistency of technical signals." && (
                <div className="bg-dark-400/40 rounded-md px-3 py-2.5">
                  <p className="text-xs uppercase tracking-wider text-purple-100 mb-1">
                    Why this confidence?
                  </p>
                  <p className="text-sm text-purple-100 leading-relaxed">
                    {llm.confidenceExplanation}
                  </p>
                </div>
              )}

            <div className="flex items-center gap-2 text-xs text-purple-100">
              <span className="font-medium">Risk:</span>
              <span
                className={cn("capitalize font-semibold", {
                  "text-green-400": llm.risk === "low",
                  "text-yellow-400": llm.risk === "medium",
                  "text-red-400": llm.risk === "high",
                })}
              >
                {llm.risk}
              </span>
            </div>
          </div>
        )}

        <IndicatorGrid snapshot={snapshot} />
      </div>
    </div>
  );
}
