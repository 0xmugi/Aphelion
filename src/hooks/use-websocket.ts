import { useEffect, useRef, useState } from "react";
import {
  pacificaWs,
  type WsSubscription,
  type WsMessage,
  type WsPriceUpdate,
  type WsPositionUpdate,
  type WsAccountInfoUpdate,
  type WsMarginUpdate,
  type WsBookUpdate,
  type WsTradeUpdate,
  type WsOrderUpdate,
} from "@/lib/pacifica-ws";

interface UseWebSocketOptions {
  account?: string | null;
  subscriptions: WsSubscription[];
  onPriceUpdate?: (prices: WsPriceUpdate[]) => void;
  onPositionUpdate?: (positions: WsPositionUpdate[]) => void;
  onAccountInfoUpdate?: (info: WsAccountInfoUpdate) => void;
  onMarginUpdate?: (margin: WsMarginUpdate) => void;
  onBookUpdate?: (book: WsBookUpdate) => void;
  onTradeUpdate?: (trades: WsTradeUpdate[]) => void;
  onOrderUpdate?: (order: WsOrderUpdate) => void;
}

export function useWebSocket({
  account,
  subscriptions,
  onPriceUpdate,
  onPositionUpdate,
  onAccountInfoUpdate,
  onMarginUpdate,
  onBookUpdate,
  onTradeUpdate,
  onOrderUpdate,
}: UseWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const cbRef = useRef({ onPriceUpdate, onPositionUpdate, onAccountInfoUpdate, onMarginUpdate, onBookUpdate, onTradeUpdate, onOrderUpdate });
  cbRef.current = { onPriceUpdate, onPositionUpdate, onAccountInfoUpdate, onMarginUpdate, onBookUpdate, onTradeUpdate, onOrderUpdate };

  const subsKey = JSON.stringify(subscriptions);

  useEffect(() => {
    pacificaWs.connect(account || undefined);

    const unsub = pacificaWs.onMessage((msg: WsMessage) => {
      setIsConnected(pacificaWs.isConnected);
      const { channel, data } = msg;

      switch (channel) {
        case "prices":
          cbRef.current.onPriceUpdate?.(data as WsPriceUpdate[]);
          break;
        case "account_positions":
          if (Array.isArray(data)) {
            cbRef.current.onPositionUpdate?.(data as WsPositionUpdate[]);
          }
          break;
        case "account_info":
          cbRef.current.onAccountInfoUpdate?.(data as WsAccountInfoUpdate);
          break;
        case "account_margin":
          cbRef.current.onMarginUpdate?.(data as WsMarginUpdate);
          break;
        case "book":
          cbRef.current.onBookUpdate?.(data as WsBookUpdate);
          break;
        case "trades":
          if (Array.isArray(data)) {
            cbRef.current.onTradeUpdate?.(data as WsTradeUpdate[]);
          }
          break;
        case "account_order_updates":
          cbRef.current.onOrderUpdate?.(data as WsOrderUpdate);
          break;
      }
    });

    const parsed: WsSubscription[] = JSON.parse(subsKey);
    parsed.forEach(sub => pacificaWs.subscribe(sub));

    const poll = setInterval(() => setIsConnected(pacificaWs.isConnected), 2000);

    return () => {
      unsub();
      clearInterval(poll);
      parsed.forEach(sub => pacificaWs.unsubscribe(sub));
    };
  }, [account, subsKey]);

  return { isConnected };
}
