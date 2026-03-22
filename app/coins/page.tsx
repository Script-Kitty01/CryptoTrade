import { fetcher } from "@/lib/coingecko.actions";
import Image from "next/image";
import Link from "next/link";

import { cn, formatPercentage, formatCurrency } from "@/lib/utils";
import DataTable from "@/components/datatable";
import CoinsPagination from "@/components/CoinsPagination";

const Coins = async ({ searchParams }: NextPageProps) => {
  const { page } = await searchParams;

  const currentPage = Number(page) || 1;
  const perPage = 10;

  let coinsData: CoinMarketData[] = [];

  try {
    coinsData = await fetcher<CoinMarketData[]>(
      "/coins/markets",
      {
        vs_currency: "usd",
        order: "market_cap_desc",
        per_page: perPage,
        page: currentPage,
        sparkline: false,
      },
      300,
    );
  } catch (error) {
    const isRateLimited =
      error instanceof Error && error.message === "RATE_LIMITED";
    return (
      <main id="coins-page">
        <div className="content flex items-center justify-center min-h-96">
          <div className="text-center space-y-3">
            <p className="text-xl font-semibold text-red-500">
              {isRateLimited ? "Rate limit reached" : "Failed to load coins"}
            </p>
            <p className="text-purple-100 text-sm">
              {isRateLimited
                ? "Too many requests. Please wait a moment and refresh."
                : "Something went wrong. Please try again later."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  const columns: DataTableColumn<CoinMarketData>[] = [
    {
      header: "Rank",
      cellClassName: "rank-cell",
      cell: (coin) => (
        <>
          #{coin.market_cap_rank}
          <Link href={`/coins/${coin.id}`} aria-label="View coin" />
        </>
      ),
    },
    {
      header: "Token",
      cellClassName: "token-cell",
      cell: (coin) => (
        <div className="token-info">
          <Image src={coin.image} alt={coin.name} width={36} height={36} />
          <p>
            {coin.name} ({coin.symbol.toUpperCase()})
          </p>
        </div>
      ),
    },
    {
      header: "Price",
      cellClassName: "price-cell",
      cell: (coin) => formatCurrency(coin.current_price),
    },
    {
      header: "24h Change",
      cellClassName: "change-cell",
      cell: (coin) => {
        const isTrendingUp = coin.price_change_percentage_24h > 0;

        return (
          <span
            className={cn("change-value", {
              "text-green-600": isTrendingUp,
              "text-red-500": !isTrendingUp,
            })}
          >
            {isTrendingUp && "+"}
            {formatPercentage(coin.price_change_percentage_24h)}
          </span>
        );
      },
    },
    {
      header: "Market Cap",
      cellClassName: "market-cap-cell",
      cell: (coin) => formatCurrency(coin.market_cap),
    },
  ];

  const hasMorePages = coinsData.length === perPage;

  const estimatedTotalPages =
    currentPage >= 100 ? Math.ceil(currentPage / 100) * 100 + 100 : 100;
  return (
    <main id="coins-page">
      <div className="content">
        <h4>All Coins</h4>

        <DataTable
          tableClassName="coins-table"
          columns={columns}
          data={coinsData}
          rowKey={(coin) => coin.id}
        />

        <CoinsPagination
          currentPage={currentPage}
          totalPages={estimatedTotalPages}
          hasMorePages={hasMorePages}
        />
      </div>
    </main>
  );
};

export default Coins;
