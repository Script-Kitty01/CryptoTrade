"use client";

import { useState } from "react";
import { Search, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SearchCoin {
  id: string;
  name: string;
  symbol: string;
  thumb: string;
  large: string;
}

interface AddHoldingDialogProps {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}

export default function AddHoldingDialog({
  open,
  onClose,
  onAdded,
}: AddHoldingDialogProps) {
  const [step, setStep] = useState<"search" | "details">("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchCoin[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState<SearchCoin | null>(null);
  const [quantity, setQuantity] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [buyDate, setBuyDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSearch = async () => {
    if (query.trim().length < 2) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setResults(data.coins ?? []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const selectCoin = (coin: SearchCoin) => {
    setSelectedCoin(coin);
    setStep("details");
  };

  const handleSubmit = async () => {
    if (!selectedCoin || !quantity || !buyPrice) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coinId: selectedCoin.id,
          coinName: selectedCoin.name,
          coinSymbol: selectedCoin.symbol,
          coinImage: selectedCoin.large || selectedCoin.thumb,
          quantity: Number(quantity),
          buyPriceUsd: Number(buyPrice),
          buyDate,
          notes: notes || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to add");
      }

      onAdded();
      onClose();
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add holding");
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setStep("search");
    setQuery("");
    setResults([]);
    setSelectedCoin(null);
    setQuantity("");
    setBuyPrice("");
    setBuyDate(new Date().toISOString().split("T")[0]);
    setNotes("");
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-dark-500 border border-purple-600/20 rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-4">
          {step === "search" ? "Add Holding" : "Enter Details"}
        </h2>

        {step === "search" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search coins..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={searching}>
                {searching ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Search className="size-4" />
                )}
              </Button>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1">
              {results.map((coin) => (
                <button
                  key={coin.id}
                  onClick={() => selectCoin(coin)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-dark-400/50 transition-colors text-left"
                >
                  {coin.thumb && (
                    <img
                      src={coin.thumb}
                      alt={coin.name}
                      className="size-8 rounded-full"
                    />
                  )}
                  <div>
                    <p className="text-white font-medium">{coin.name}</p>
                    <p className="text-xs text-purple-100/60">
                      {coin.symbol?.toUpperCase()}
                    </p>
                  </div>
                  <Plus className="size-4 text-purple-100/60 ml-auto" />
                </button>
              ))}
              {!searching && query.length >= 2 && results.length === 0 && (
                <p className="text-sm text-purple-100/60 text-center py-4">
                  No coins found
                </p>
              )}
            </div>
          </div>
        )}

        {step === "details" && selectedCoin && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-dark-400/40 rounded-lg">
              {selectedCoin.thumb && (
                <img
                  src={selectedCoin.thumb}
                  alt={selectedCoin.name}
                  className="size-10 rounded-full"
                />
              )}
              <div>
                <p className="text-white font-medium">{selectedCoin.name}</p>
                <p className="text-sm text-purple-100/60">
                  {selectedCoin.symbol?.toUpperCase()}
                </p>
              </div>
              <button
                onClick={() => setStep("search")}
                className="ml-auto text-xs text-purple-100/60 hover:text-purple-100"
              >
                Change
              </button>
            </div>

            <div>
              <label className="block text-sm text-purple-100 mb-1">
                Quantity
              </label>
              <Input
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm text-purple-100 mb-1">
                Buy Price (USD)
              </label>
              <Input
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                value={buyPrice}
                onChange={(e) => setBuyPrice(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm text-purple-100 mb-1">
                Buy Date
              </label>
              <Input
                type="date"
                value={buyDate}
                onChange={(e) => setBuyDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm text-purple-100 mb-1">
                Notes (optional)
              </label>
              <Input
                placeholder="e.g. DCA entry"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 p-2 rounded">
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !quantity || !buyPrice}
                className="flex-1"
              >
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Add Holding"
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
