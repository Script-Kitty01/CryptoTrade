import { fetcher } from "@/lib/coingecko.actions";
import Image from "next/image";
import Link from "next/link";
import { cn, formatCurrency, formatPercentage } from "@/lib/utils";
import { TrendingDown, TrendingUp } from "lucide-react";

interface GainerLoserCoin {
  id: string;
  name: string;
  symbol: string;
  image: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap_rank: number;
}

const TopGainersLosers = async () => {
  let coins: GainerLoserCoin[] = [];

  try {
    coins = await fetcher<GainerLoserCoin[]>(
      "/coins/markets",
      {
        vs_currency: "usd",
        order: "market_cap_desc",
        per_page: 250,
        page: 1,
        sparkline: false,
      },
      300,
    );
  } catch (error) {
    console.error("Error fetching top gainers/losers:", error);
    return null;
  }

  const sorted = [...coins]
    .filter((c) => typeof c.price_change_percentage_24h === "number")
    .sort(
      (a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h,
    );

  const gainers = sorted.slice(0, 5);
  const losers = sorted.slice(-5).reverse();

  const CoinCard = ({
    coin,
    isGainer,
  }: {
    coin: GainerLoserCoin;
    isGainer: boolean;
  }) => (
    <Link href={`/coins/${coin.id}`} id="coin-card" className="group">
      <div className="header">
        <Image
          src={coin.image}
          alt={coin.name}
          width={48}
          height={48}
          className="rounded-full"
        />
        <div>
          <h3>{coin.name}</h3>
          <p>{coin.symbol.toUpperCase()}</p>
        </div>
      </div>
      <div className="price-row">
        <span className="price">{formatCurrency(coin.current_price)}</span>
        <span
          className={cn("change", isGainer ? "text-pink-400" : "text-red-500")}
        >
          {formatPercentage(coin.price_change_percentage_24h)}
          {isGainer ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
        </span>
      </div>
      <div className="stats">
        <div className="stat-row">
          <span className="label">Rank</span>
          <span className="value">#{coin.market_cap_rank}</span>
        </div>
      </div>
    </Link>
  );

  return (
    <div id="top-gainers-losers">
      <div className="home-grid">
        <div className="space-y-4">
          <h4 className="text-xl md:text-2xl font-semibold text-pink-400 flex items-center gap-2">
            <TrendingUp size={24} />
            Top Gainers (24h)
          </h4>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {gainers.map((coin) => (
              <CoinCard key={coin.id} coin={coin} isGainer />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-xl md:text-2xl font-semibold text-red-500 flex items-center gap-2">
            <TrendingDown size={24} />
            Top Losers (24h)
          </h4>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {losers.map((coin) => (
              <CoinCard key={coin.id} coin={coin} isGainer={false} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopGainersLosers;
