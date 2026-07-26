"use client";

import { useEffect, useState } from "react";
import QuantPanel from "./QuantPanel";
import { QuantSnapshot } from "@/lib/quant";
import { LLMAnalysisResult } from "@/lib/llm";

interface TrendAnalyzerProps {
  coinId: string;
}

interface AnalysisResponse {
  coinId: string;
  timestamp: number;
  quant: QuantSnapshot;
  llm: LLMAnalysisResult;
}

export default function TrendAnalyzer({ coinId }: TrendAnalyzerProps) {
  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let intervalId: NodeJS.Timeout | null = null;

    const fetchAnalysis = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/coins/${coinId}/analyze`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `HTTP ${res.status}`);
        }
        const json = (await res.json()) as AnalysisResponse;
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Analysis failed");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAnalysis();
    intervalId = setInterval(fetchAnalysis, 60_000);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [coinId]);

  return (
    <QuantPanel
      snapshot={data?.quant ?? null}
      llm={data?.llm ?? null}
      loading={loading && !data}
      error={error}
    />
  );
}
