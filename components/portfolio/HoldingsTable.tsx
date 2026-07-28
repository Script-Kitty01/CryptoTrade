"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface Holding {
  id: string;
  coinId: string;
  coinName: string;
  coinSymbol: string;
  coinImage: string;
  quantity: number;
  buyPriceUsd: number;
  buyDate: string;
  notes: string | null;
}

interface CoinPrice {
  id: string;
  current_price: number;
  price_change_percentage_24h: number;
}

export default function HoldingsTable() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [prices, setPrices] = useState<Map<string, CoinPrice>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHoldings = useCallback(async () => {
    try {
      const res = await fetch("/api/portfolio");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setHoldings(data);
      setError(null);
    } catch {
      setError("Failed to load portfolio");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPrices = useCallback(async (coinIds: string[]) => {
    if (coinIds.length === 0) return;
    try {
      const res = await fetch(`/api/prices?ids=${coinIds.join(",")}`);
      if (!res.ok) return;
      const data = await res.json();
      const map = new Map<string, CoinPrice>();
      (data.prices || []).forEach((c: CoinPrice) => map.set(c.id, c));
      setPrices(map);
    } catch {
      // prices are best-effort
    }
  }, []);

  useEffect(() => {
    fetchHoldings();
  }, [fetchHoldings]);

  useEffect(() => {
    if (holdings.length > 0) {
      const ids = holdings.map((h) => h.coinId);
      fetchPrices(ids);
    }
  }, [holdings, fetchPrices]);

  const deleteHolding = async (id: string) => {
    try {
      await fetch(`/api/portfolio/${id}`, { method: "DELETE" });
      setHoldings((prev) => prev.filter((h) => h.id !== id));
    } catch {
      // silent
    }
  };

  const totalInvested = holdings.reduce(
    (sum, h) => sum + h.quantity * h.buyPriceUsd,
    0,
  );

  const totalCurrent = holdings.reduce((sum, h) => {
    const price = prices.get(h.coinId)?.current_price ?? h.buyPriceUsd;
    return sum + h.quantity * price;
  }, 0);

  const totalPnl = totalCurrent - totalInvested;
  const pnlPercent = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 bg-dark-400/30 rounded-lg"
          >
            <Skeleton className="size-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (holdings.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-purple-100 text-lg font-medium mb-2">
          No holdings yet
        </p>
        <p className="text-sm text-purple-100/60">
          Add coins to your portfolio to track your P&L
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-dark-400/40 rounded-lg p-4">
          <p className="text-xs text-purple-100/60 mb-1">Total Invested</p>
          <p className="text-lg font-semibold text-white">
            {formatCurrency(totalInvested)}
          </p>
        </div>
        <div className="bg-dark-400/40 rounded-lg p-4">
          <p className="text-xs text-purple-100/60 mb-1">Current Value</p>
          <p className="text-lg font-semibold text-white">
            {formatCurrency(totalCurrent)}
          </p>
        </div>
        <div className="bg-dark-400/40 rounded-lg p-4">
          <p className="text-xs text-purple-100/60 mb-1">Total P&L</p>
          <p
            className={`text-lg font-semibold ${
              totalPnl >= 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            {totalPnl >= 0 ? "+" : ""}
            {formatCurrency(totalPnl)}
          </p>
        </div>
        <div className="bg-dark-400/40 rounded-lg p-4">
          <p className="text-xs text-purple-100/60 mb-1">P&L %</p>
          <p
            className={`text-lg font-semibold ${
              pnlPercent >= 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            {pnlPercent >= 0 ? "+" : ""}
            {pnlPercent.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Holdings List */}
      <div className="space-y-2">
        {holdings.map((h) => {
          const price = prices.get(h.coinId);
          const currentPrice = price?.current_price ?? h.buyPriceUsd;
          const change24h = price?.price_change_percentage_24h ?? 0;
          const pnl = (currentPrice - h.buyPriceUsd) * h.quantity;
          const pnlPct =
            h.buyPriceUsd > 0
              ? ((currentPrice - h.buyPriceUsd) / h.buyPriceUsd) * 100
              : 0;

          return (
            <div
              key={h.id}
              className="flex items-center gap-4 p-4 bg-dark-400/30 rounded-lg hover:bg-dark-400/50 transition-colors"
            >
              {h.coinImage && (
                <img
                  src={h.coinImage}
                  alt={h.coinName}
                  className="size-10 rounded-full"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">
                  {h.coinName}
                  <span className="text-purple-100/60 ml-1.5 text-sm">
                    {h.coinSymbol?.toUpperCase()}
                  </span>
                </p>
                <p className="text-xs text-purple-100/60">
                  {h.quantity.toLocaleString()} @{" "}
                  {formatCurrency(h.buyPriceUsd)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-white font-medium">
                  {formatCurrency(currentPrice)}
                </p>
                <p
                  className={`text-xs flex items-center justify-end gap-0.5 ${
                    change24h >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {change24h >= 0 ? (
                    <TrendingUp className="size-3" />
                  ) : (
                    <TrendingDown className="size-3" />
                  )}
                  {change24h.toFixed(2)}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-white font-medium">
                  {formatCurrency(h.quantity * currentPrice)}
                </p>
                <p
                  className={`text-xs ${
                    pnl >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {pnl >= 0 ? "+" : ""}
                  {formatCurrency(pnl)} ({pnlPct >= 0 ? "+" : ""}
                  {pnlPct.toFixed(2)}%)
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteHolding(h.id)}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
