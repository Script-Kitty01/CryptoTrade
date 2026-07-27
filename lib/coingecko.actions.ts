"use server";

import qs from "query-string";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetcher<T>(
  endpoint: string,
  params?: QueryParams,
  revalidate = 300,
  retries = MAX_RETRIES,
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
    { skipEmptyString: true, skipNull: true, sort: () => 0 },
  );

  // Demo keys use x-cg-demo-api-key, Pro keys use x-cg-pro-api-key
  const apiKeyHeader = API_KEY.startsWith("CG-")
    ? "x-cg-demo-api-key"
    : "x-cg-pro-api-key";

  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch(url, {
      headers: {
        [apiKeyHeader]: API_KEY,
        "Content-Type": "application/json",
      },
      next: { revalidate },
    });

    if (response.status === 429) {
      if (attempt < retries) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 1000;
        console.warn(
          `[fetcher] 429 rate-limited on ${endpoint}, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${retries})`,
        );
        await sleep(delay);
        continue;
      }
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

  throw new Error("RATE_LIMITED");
}

/**
 * Runs async tasks with a concurrency limit to avoid rate-limiting.
 */
export async function withConcurrencyLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let index = 0;

  async function worker(): Promise<void> {
    while (index < tasks.length) {
      const i = index++;
      try {
        results[i] = await tasks[i]();
      } catch (error) {
        console.error(`[concurrency] task ${i} failed:`, error);
        results[i] = undefined as unknown as T;
      }
    }
  }

  await Promise.all(Array.from({ length: limit }, () => worker()));
  return results.filter((r): r is T => r !== undefined);
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
