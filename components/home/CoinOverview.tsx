import React from "react";
import { fetcher } from "@/lib/coingecko.actions";
import Image from "next/image";
import Link from "next/link";
import { formatCurrency, formatPercentage, trendingClasses } from "@/lib/utils";
import { CoinOverviewFallback } from "./fallback";
import CandlestickChart from "@/components/CandlestickChart";
import { TrendingDown, TrendingUp } from "lucide-react";

interface CoinOverviewData {
  coin: CoinDetailsData;
  coinOHLCData: OHLCData[];
}

async function fetchCoinOverview(): Promise<CoinOverviewData | null> {
  try {
    const [coin, coinOHLCData] = await Promise.all([
      fetcher<CoinDetailsData>(
        "/coins/bitcoin",
        { dex_pair_format: "symbol" },
        600,
      ),
      fetcher<OHLCData[]>(
        "/coins/bitcoin/ohlc",
        {
          vs_currency: "usd",
          days: 1,
        },
        600,
      ),
    ]);

    return { coin, coinOHLCData };
  } catch (error) {
    console.error("Error fetching coin overview:", error);
    return null;
  }
}

const CoinOverview = async () => {
  const data = await fetchCoinOverview();

  if (!data) {
    return <CoinOverviewFallback />;
  }

  const { coin, coinOHLCData } = data;
  const priceChange24h =
    coin.market_data.price_change_percentage_24h_in_currency.usd;
  const { textClass } = trendingClasses(priceChange24h);

  return (
    <div id="coin-overview">
      <CandlestickChart data={coinOHLCData} coinId="bitcoin">
        <div className="header pt-2">
          <Image
            src={coin.image.large}
            alt={coin.name}
            width={56}
            height={56}
          />
          <div className="info">
            <p>
              {coin.name} / {coin.symbol.toUpperCase()}
            </p>
            <h1>{formatCurrency(coin.market_data.current_price.usd)}</h1>
            <Link
              href={`/coins/${coin.id}`}
              className={`inline-flex items-center gap-1 text-sm font-medium ${textClass} hover:underline`}
            >
              {formatPercentage(priceChange24h)}
              {priceChange24h > 0 ? (
                <TrendingUp size={14} />
              ) : (
                <TrendingDown size={14} />
              )}
              <span className="text-purple-100">(24h)</span>
            </Link>
          </div>
        </div>
      </CandlestickChart>
    </div>
  );
};

export default CoinOverview;
