import React from "react";
import DataTable from "@/components/datatable";

interface SkeletonRow {
  id: number;
}

export const CoinOverviewFallback = () => {
  return (
    <div id="coin-overview-fallback">
      <div className="header pt-2">
        <div className="header-image skeleton" />
        <div className="info">
          <div className="header-line-sm skeleton" />
          <div className="header-line-lg skeleton" />
        </div>
      </div>
      <div className="chart">
        <div className="chart-skeleton skeleton" />
      </div>
    </div>
  );
};

export const TrendingCoinsFallback = () => {
  const columns: DataTableColumn<SkeletonRow>[] = [
    {
      header: "Name",
      cell: () => (
        <div className="name-link">
          <div className="name-image skeleton" />
          <div className="name-line skeleton" />
        </div>
      ),
    },
    {
      header: "24h Change",
      cell: () => (
        <div className="price-change">
          <div className="change-icon skeleton" />
          <div className="change-line skeleton" />
        </div>
      ),
    },
    {
      header: "Price",
      cell: () => <div className="price-line skeleton" />,
    },
  ];

  const dummyData: SkeletonRow[] = Array.from({ length: 6 }, (_, i) => ({
    id: i,
  }));

  return (
    <div id="trending-coins-fallback">
      <h4>Trending Coins</h4>
      <DataTable
        data={dummyData}
        columns={columns}
        rowKey={(item) => item.id}
        tableClassName="trending-coins-table"
      />
    </div>
  );
};

export const CategoriesFallback = () => {
  const columns: DataTableColumn<SkeletonRow>[] = [
    {
      header: "Category",
      cellClassName: "category-cell",
      cell: () => <div className="category-line skeleton" />,
    },
    {
      header: "Top Gainers",
      cellClassName: "top-gainers-cell",
      cell: () => (
        <div className="flex gap-1">
          <div className="gainer-image skeleton" />
          <div className="gainer-image skeleton" />
          <div className="gainer-image skeleton" />
        </div>
      ),
    },
    {
      header: "24h Change",
      cellClassName: "change-header-cell",
      cell: () => (
        <div className="change-cell">
          <div className="change-icon skeleton" />
          <div className="change-line skeleton" />
        </div>
      ),
    },
    {
      header: "Market Cap",
      cellClassName: "market-cap-cell",
      cell: () => <div className="value-skeleton-lg skeleton" />,
    },
    {
      header: "24h Volume",
      cellClassName: "volume-cell",
      cell: () => <div className="value-skeleton-md skeleton" />,
    },
  ];

  const dummyData: SkeletonRow[] = Array.from({ length: 10 }, (_, i) => ({
    id: i,
  }));

  return (
    <div id="categories-fallback">
      <h4>Top Categories</h4>
      <DataTable
        data={dummyData}
        columns={columns}
        rowKey={(item) => item.id}
        tableClassName="mt-3"
      />
    </div>
  );
};

export const TopGainersLosersFallback = () => {
  return (
    <div id="top-gainers-losers">
      <div className="home-grid">
        <div className="space-y-4">
          <h4 className="text-xl md:text-2xl font-semibold text-pink-400 flex items-center gap-2">
            <span className="size-6 skeleton rounded" />
            Top Gainers (24h)
          </h4>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={`gainer-${i}`}
                id="coin-card"
                className="pointer-events-none"
              >
                <div className="header">
                  <div className="size-12 rounded-full skeleton" />
                  <div className="space-y-2">
                    <div className="h-5 w-28 skeleton" />
                    <div className="h-3 w-12 skeleton" />
                  </div>
                </div>
                <div className="price-row">
                  <div className="h-6 w-24 skeleton" />
                  <div className="h-5 w-16 skeleton" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-xl md:text-2xl font-semibold text-red-500 flex items-center gap-2">
            <span className="size-6 skeleton rounded" />
            Top Losers (24h)
          </h4>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={`loser-${i}`}
                id="coin-card"
                className="pointer-events-none"
              >
                <div className="header">
                  <div className="size-12 rounded-full skeleton" />
                  <div className="space-y-2">
                    <div className="h-5 w-28 skeleton" />
                    <div className="h-3 w-12 skeleton" />
                  </div>
                </div>
                <div className="price-row">
                  <div className="h-6 w-24 skeleton" />
                  <div className="h-5 w-16 skeleton" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
