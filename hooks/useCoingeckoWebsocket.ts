"use client";

import { useEffect, useRef, useState } from "react";

export interface ExtendedPriceData {
  price: number;
  timestamp: number;
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
  liveInterval?: string;
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

  const connect = () => {
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
      if (!subscribed.current.has("price")) {
        send({ type: "subscribe", channel: "price", coinId });
        subscribed.current.add("price");
      }

      if (!subscribed.current.has("trades")) {
        send({ type: "subscribe", channel: "trades", coinId });
        subscribed.current.add("trades");
      }

      if (!subscribed.current.has("ohlcv")) {
        send({
          type: "subscribe",
          channel: "ohlcv",
          coinId,
          interval: liveInterval,
        });
        subscribed.current.add("ohlcv");
      }
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      // Keepalive
      if (msg.type === "ping") {
        send({ type: "pong" });
        return;
      }

      // Price updates
      if (msg.type === "price") {
        setPrice(msg.data);
      }

      // Trades updates
      if (msg.type === "trade") {
        setTrades((prev) => [msg.data, ...prev].slice(0, 50));
      }

      // OHLC updates
      if (msg.type === "ohlcv") {
        setOhlcv(msg.data);
      }
    };

    ws.onclose = () => {
      setIsReady(false);
    };

    ws.onerror = (err) => {
      console.error("WebSocket error", err);
    };
  };

  useEffect(() => {
    connect();

    return () => {
      wsRef.current?.close();
      subscribed.current.clear();
    };
  }, [coinId, poolId, liveInterval]);

  const reconnect = () => {
    wsRef.current?.close();
    subscribed.current.clear();
    connect();
  };

  return {
    price,
    trades,
    ohlcv,
    isReady,
    reconnect,
  };
}
