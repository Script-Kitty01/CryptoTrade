"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface ExtendedPriceData {
  price: number;
  timestamp: number;
  change24h?: number;
}

export interface Trade {
  price: number;
  volume: number;
  timestamp: number;
}

export type OHLCData = [number, number, number, number, number];

interface UseCoingeckoWebsocketProps {
  coinId: string;
  poolId?: string;
  liveInterval?: "1s" | "1m";
}

interface UseCoingeckoWebsocketReturn {
  price: ExtendedPriceData | null;
  trades: Trade[];
  ohlcv: OHLCData | null;
  isReady: boolean;
  reconnect: () => void;
}

const WS_BASE =
  `${process.env.NEXT_PUBLIC_COINGECKO_WEBSOCKET_URL}` +
  `?x_cg_pro_api_key=${process.env.NEXT_PUBLIC_COINGECKO_API_KEY}`;

export function useCoingeckoWebsocket({
  coinId,
  poolId,
  liveInterval = "1m",
}: UseCoingeckoWebsocketProps): UseCoingeckoWebsocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const subscribed = useRef<Set<string>>(new Set());

  const [price, setPrice] = useState<ExtendedPriceData | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [ohlcv, setOhlcv] = useState<OHLCData | null>(null);
  const [isReady, setIsReady] = useState(false);

  const connect = useCallback(() => {
    if (!WS_BASE) return;

    const ws = new WebSocket(WS_BASE);
    wsRef.current = ws;

    const send = (payload: Record<string, unknown>) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(payload));
      }
    };

    ws.onopen = () => {
      setIsReady(true);

      // Subscribe to channels
      const channels = [
        { type: "subscribe", channel: "price", coinId },
        { type: "subscribe", channel: "trades", coinId },
        {
          type: "subscribe",
          channel: "ohlcv",
          coinId,
          interval: liveInterval,
          ...(poolId ? { poolId } : {}),
        },
      ] as const;

      channels.forEach((payload) => {
        const key = `${payload.channel}-${payload.coinId}-${liveInterval}`;
        if (!subscribed.current.has(key)) {
          send(payload as unknown as Record<string, unknown>);
          subscribed.current.add(key);
        }
      });
    };

    ws.onmessage = (event) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(event.data);
      } catch {
        console.error("WebSocket received invalid JSON");
        return;
      }

      // Keepalive
      if (msg.type === "ping") {
        send({ type: "pong" });
        return;
      }

      // Price updates
      if (msg.type === "price") {
        setPrice((msg.data as ExtendedPriceData | undefined) ?? null);
      }

      // Trades updates
      if (msg.type === "trade") {
        setTrades((prev) => [msg.data as Trade, ...prev].slice(0, 50));
      }

      // OHLC updates
      if (msg.type === "ohlcv") {
        setOhlcv((msg.data as OHLCData | undefined) ?? null);
      }
    };

    ws.onclose = () => {
      setIsReady(false);
    };

    ws.onerror = (err) => {
      console.error("WebSocket error", err);
    };
  }, [coinId, poolId, liveInterval]);

  useEffect(() => {
    const subscribedSet = subscribed.current;
    connect();

    return () => {
      wsRef.current?.close();
      subscribedSet.clear();
    };
  }, [connect]);

  const reconnect = useCallback(() => {
    wsRef.current?.close();
    subscribed.current.clear();
    connect();
  }, [connect]);

  return {
    price,
    trades,
    ohlcv,
    isReady,
    reconnect,
  };
}
