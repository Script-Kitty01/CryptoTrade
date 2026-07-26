"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Search } from "lucide-react";

interface SearchCoin {
  id: string;
  name: string;
  symbol: string;
  market_cap_rank: number | null;
  thumb: string;
  large: string;
}

const Header = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchCoin[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      return;
    }

    const fetchTrending = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/search/trending");
        if (!res.ok) throw new Error("Failed to load trending");
        const data = await res.json();
        setResults(data.coins?.map((c: { item: SearchCoin }) => c.item) ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTrending();
  }, [open]);

  useEffect(() => {
    if (query.trim().length < 2) {
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/search?query=${encodeURIComponent(query)}`,
        );
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        setResults(data.coins ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (coinId: string) => {
    setOpen(false);
    router.push(`/coins/${coinId}`);
  };

  return (
    <>
      <header>
        <div className="main-container inner">
          <Link href="/" className="logo-link">
            <Image
              src="/logo.svg"
              alt="CrytoTrade logo"
              width={112}
              height={34}
              className="logo"
              priority
            />
          </Link>
          <nav>
            <Link
              href="/"
              className={cn("nav-link", {
                "is-active": pathname === "/",
                "is-home": true,
              })}
            >
              Home
            </Link>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="search-trigger"
              aria-label="Open search"
            >
              <Search className="size-4" />
              <span>Search</span>
              <kbd className="kbd">⌘K</kbd>
            </button>
            <Link
              href="/coins"
              className={cn("nav-link", {
                "is-active":
                  pathname === "/coins" || pathname.startsWith("/coins/"),
              })}
            >
              All coins
            </Link>
            <Link
              href="/trends"
              className={cn("nav-link", {
                "is-active": pathname === "/trends",
              })}
            >
              Trends
            </Link>
          </nav>
        </div>
      </header>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search coins..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {loading && <CommandEmpty>Searching...</CommandEmpty>}
          {!loading && results.length === 0 && query.trim().length >= 2 && (
            <CommandEmpty>No coins found.</CommandEmpty>
          )}
          {!loading && results.length === 0 && query.trim().length < 2 && (
            <CommandEmpty>Type at least 2 characters to search.</CommandEmpty>
          )}
          {!loading && results.length > 0 && (
            <CommandGroup heading={query ? "Search results" : "Trending coins"}>
              {results.map((coin) => (
                <CommandItem
                  key={coin.id}
                  value={coin.id}
                  onSelect={() => handleSelect(coin.id)}
                  className="search-item"
                >
                  <div className="coin-info">
                    <Image
                      src={coin.thumb || coin.large || "/fallback.svg"}
                      alt={coin.name}
                      width={28}
                      height={28}
                    />
                    <div>
                      <p className="font-medium">{coin.name}</p>
                      <span className="coin-symbol">{coin.symbol}</span>
                    </div>
                  </div>
                  {coin.market_cap_rank ? (
                    <span className="coin-rank">#{coin.market_cap_rank}</span>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
};

export default Header;
