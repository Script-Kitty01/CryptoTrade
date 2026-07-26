"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { QuantSnapshot } from "@/lib/quant";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface TrendsResponse {
  timestamp: number;
  count: number;
  coins: QuantSnapshot[];
}

const signalLabels: Record<QuantSnapshot["signal"], string> = {
  strong_buy: "Strong Buy",
  buy: "Buy",
  hold: "Hold",
  sell: "Sell",
  strong_sell: "Strong Sell",
};

const signalClasses: Record<QuantSnapshot["signal"], string> = {
  strong_buy: "bg-green-500/20 text-green-400 border-green-500/30",
  buy: "bg-green-400/20 text-green-300 border-green-400/30",
  hold: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  sell: "bg-red-500/20 text-red-400 border-red-500/30",
  strong_sell: "bg-red-600/20 text-red-500 border-red-600/30",
};

export default function TrendsPage() {
  const [data, setData] = useState<TrendsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let intervalId: NodeJS.Timeout | null = null;

    const fetchTrends = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/trends");
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `HTTP ${res.status}`);
        }
        const json = (await res.json()) as TrendsResponse;
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load trends",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchTrends();
    intervalId = setInterval(fetchTrends, 60_000);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return (
    <main id="trends-page" className="main-container">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold text-white">
          Trend Analyzer
        </h1>
        {data && (
          <p className="text-sm text-purple-100">
            {data.count} coins ranked by composite quant score
          </p>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      <div className="bg-dark-500 rounded-xl border border-purple-600/20 overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-5 py-3 text-sm font-medium text-purple-100 border-b border-purple-600/20">
          <div className="col-span-5 md:col-span-4">Coin</div>
          <div className="col-span-3 md:col-span-2 text-right">Price</div>
          <div className="col-span-2 md:col-span-2 text-center">Signal</div>
          <div className="col-span-2 md:col-span-2 text-center">Confidence</div>
          <div className="hidden md:block md:col-span-2 text-right">
            Composite
          </div>
        </div>

        <div className="divide-y divide-purple-600/10">
          {loading &&
            !data &&
            Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="grid grid-cols-12 gap-4 px-5 py-4 items-center"
              >
                <div className="col-span-5 md:col-span-4 flex items-center gap-3">
                  <Skeleton className="size-8 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                </div>
                <div className="col-span-3 md:col-span-2 flex justify-end">
                  <Skeleton className="h-4 w-20" />
                </div>
                <div className="col-span-2 md:col-span-2 flex justify-center">
                  <Skeleton className="h-5 w-16" />
                </div>
                <div className="col-span-2 md:col-span-2 flex justify-center">
                  <Skeleton className="h-4 w-10" />
                </div>
                <div className="hidden md:block md:col-span-2 flex justify-end">
                  <Skeleton className="h-4 w-12" />
                </div>
              </div>
            ))}

          {data?.coins.map((coin, index) => (
            <Link
              key={coin.coinId}
              href={`/coins/${coin.coinId}`}
              className="grid grid-cols-12 gap-4 px-5 py-4 items-center hover:bg-dark-400/40 transition-colors"
            >
              <div className="col-span-5 md:col-span-4 flex items-center gap-3">
                <span className="text-sm text-purple-100 w-6">
                  #{index + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-white truncate">
                    {coin.name}
                  </p>
                  <p className="text-xs text-purple-100 uppercase">
                    {coin.symbol}
                  </p>
                </div>
              </div>
              <div className="col-span-3 md:col-span-2 text-right text-sm font-medium text-white">
                {formatCurrency(coin.price, 4)}
              </div>
              <div className="col-span-2 md:col-span-2 flex justify-center">
                <Badge variant="outline" className={signalClasses[coin.signal]}>
                  {signalLabels[coin.signal]}
                </Badge>
              </div>
              <div className="col-span-2 md:col-span-2 text-center text-sm text-white">
                {coin.confidence}%
              </div>
              <div className="hidden md:block md:col-span-2 text-right text-sm font-medium text-white">
                {coin.scores.composite.toFixed(1)}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
