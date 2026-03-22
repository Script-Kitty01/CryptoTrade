"use server";

import qs from "query-string";

export async function fetcher<T>(
  endpoint: string,
  params?: QueryParams,
  revalidate = 300,
): Promise<T> {
  const BASE_URL = process.env.COINGECKO_BASE_URL;
  const API_KEY = process.env.COINGECKO_API_KEY;

  if (!BASE_URL) throw new Error("COINGECKO_BASE_URL is not set");
  if (!API_KEY) throw new Error("COINGECKO_API_KEY is not set");

  const url = qs.stringifyUrl(
    {
      url: `${BASE_URL}/${endpoint}`,
      query: params,
    },
    { skipEmptyString: true, skipNull: true },
  );

  // Demo keys use x-cg-demo-api-key, Pro keys use x-cg-pro-api-key
  const apiKeyHeader = API_KEY.startsWith("CG-")
    ? "x-cg-demo-api-key"
    : "x-cg-pro-api-key";

  const response = await fetch(url, {
    headers: {
      [apiKeyHeader]: API_KEY,
      "Content-Type": "application/json",
    },
    next: { revalidate },
  });

  if (response.status === 429) {
    throw new Error("RATE_LIMITED");
  }

  if (!response.ok) {
    const errorBody: CoinGeckoErrorBody = await response
      .json()
      .catch(() => ({}));
    throw new Error(
      `API Error: ${response.status}: ${errorBody.error || response.statusText}`,
    );
  }

  return response.json();
}

export async function getPools(
  id: string,
  network?: string | null,
  contractAddress?: string | null,
): Promise<PoolData> {
  const fallback: PoolData = { id: "", address: "", name: "", network: "" };

  if (network && contractAddress) {
    try {
      const poolData = await fetcher<{ data: PoolData[] }>(
        `/onchain/networks/${network}/tokens/${contractAddress}/pools`,
        undefined,
        600,
      );
      return poolData.data?.[0] ?? fallback;
    } catch {
      return fallback;
    }
  }

  try {
    const poolData = await fetcher<{ data: PoolData[] }>(
      "/onchain/search/pools",
      { query: id },
      600,
    );
    return poolData.data?.[0] ?? fallback;
  } catch {
    return fallback;
  }
}
