"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Star, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface WatchlistItem {
  id: string;
  coinId: string;
  coinName: string;
  coinSymbol: string;
  coinImage: string;
  addedAt: string;
}

interface CoinPrice {
  id: string;
  current_price: number;
  price_change_percentage_24h: number;
}

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [prices, setPrices] = useState<Map<string, CoinPrice>>(new Map());
  const [loading, setLoading] = useState(true);

  const fetchWatchlist = useCallback(async () => {
    try {
      const res = await fetch("/api/watchlist");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setItems(data);
    } catch {
      // silent
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
      // best-effort
    }
  }, []);

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  useEffect(() => {
    if (items.length > 0) {
      const ids = items.map((i) => i.coinId);
      fetchPrices(ids);
    }
  }, [items, fetchPrices]);

  const removeItem = async (coinId: string) => {
    try {
      await fetch(`/api/watchlist/${coinId}`, { method: "DELETE" });
      setItems((prev) => prev.filter((i) => i.coinId !== coinId));
    } catch {
      // silent
    }
  };

  if (loading) {
    return (
      <main className="main-container">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-6">
          Watchlist
        </h1>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
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
            </div>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="main-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            Watchlist
          </h1>
          <p className="text-sm text-purple-100/60 mt-1">
            {items.length} coin{items.length !== 1 ? "s" : ""} saved
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="bg-dark-500 rounded-xl border border-purple-600/20 p-12 text-center">
          <Star className="size-12 text-purple-100/30 mx-auto mb-4" />
          <p className="text-purple-100 text-lg font-medium mb-2">
            Your watchlist is empty
          </p>
          <p className="text-sm text-purple-100/60 mb-4">
            Browse coins and add them to your watchlist for quick access
          </p>
          <Link href="/coins">
            <Button>Browse Coins</Button>
          </Link>
        </div>
      ) : (
        <div className="bg-dark-500 rounded-xl border border-purple-600/20 overflow-hidden">
          <div className="space-y-0 divide-y divide-purple-600/10">
            {items.map((item) => {
              const price = prices.get(item.coinId);
              const currentPrice = price?.current_price ?? null;
              const change24h = price?.price_change_percentage_24h ?? 0;

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-4 p-4 hover:bg-dark-400/30 transition-colors"
                >
                  <Link
                    href={`/coins/${item.coinId}`}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    {item.coinImage && (
                      <img
                        src={item.coinImage}
                        alt={item.coinName}
                        className="size-10 rounded-full"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-white font-medium truncate">
                        {item.coinName}
                        <span className="text-purple-100/60 ml-1.5 text-sm">
                          {item.coinSymbol?.toUpperCase()}
                        </span>
                      </p>
                      <p className="text-xs text-purple-100/60">
                        Added {new Date(item.addedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </Link>

                  {currentPrice && (
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
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(item.coinId)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 shrink-0"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}
