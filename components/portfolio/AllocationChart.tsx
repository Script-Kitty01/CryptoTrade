"use client";

interface Holding {
  id: string;
  coinId: string;
  coinName: string;
  coinSymbol: string;
  quantity: number;
  buyPriceUsd: number;
}

interface CoinPrice {
  id: string;
  current_price: number;
}

interface AllocationChartProps {
  holdings: Holding[];
  prices: Map<string, CoinPrice>;
}

const COLORS = [
  "#a78bfa",
  "#60a5fa",
  "#34d399",
  "#fbbf24",
  "#f472b6",
  "#fb923c",
  "#94a3b8",
  "#4ade80",
  "#c084fc",
  "#38bdf8",
];

export default function AllocationChart({
  holdings,
  prices,
}: AllocationChartProps) {
  if (holdings.length === 0) return null;

  const data = holdings.map((h) => {
    const price = prices.get(h.coinId)?.current_price ?? h.buyPriceUsd;
    return {
      name: h.coinSymbol?.toUpperCase() || h.coinName,
      value: h.quantity * price,
      color: COLORS[0], // assigned below
    };
  });

  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return null;

  // Assign colors and percentages
  let cumulative = 0;
  const segments = data.map((d, i) => {
    const percent = (d.value / total) * 100;
    const start = cumulative;
    cumulative += percent;
    return {
      ...d,
      color: COLORS[i % COLORS.length],
      percent,
      start,
    };
  });

  // Build conic-gradient string
  const gradient = segments
    .map((s) => `${s.color} ${s.start}% ${s.start + s.percent}%`)
    .join(", ");

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="size-48 rounded-full"
        style={{
          background: `conic-gradient(${gradient})`,
        }}
      />
      <div className="flex flex-wrap justify-center gap-3">
        {segments.map((s) => (
          <div key={s.name} className="flex items-center gap-1.5">
            <div
              className="size-3 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-xs text-purple-100">
              {s.name} ({s.percent.toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
