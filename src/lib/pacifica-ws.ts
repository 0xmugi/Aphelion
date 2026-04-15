/**
 * Pacifica WebSocket client — matches the real wss://ws.pacifica.fi/ws protocol.
 * Supports: prices, book, bbo, trades, mark_price_candle,
 *           account_margin, account_leverage, account_info,
 *           account_positions, account_order_updates, account_trades
 */

const WS_URL = "wss://ws.pacifica.fi/ws";

export type WsChannel =
  | "prices"
  | "book"
  | "bbo"
  | "trades"
  | "mark_price_candle"
  | "account_margin"
  | "account_leverage"
  | "account_info"
  | "account_positions"
  | "account_order_updates"
  | "account_trades";

/** Subscription params sent to the server */
export interface WsSubscription {
  source: WsChannel;
  account?: string;
  symbol?: string;
  agg_level?: number;
  interval?: string;
}

export interface WsMessage {
  channel: string;
  data: unknown;
  li?: number;
}

// ---- Typed payloads ----

export interface WsPriceUpdate {
  symbol: string;
  mark: string;
  mid: string;
  funding: string;
  next_funding: string;
  oracle: string;
  volume_24h: string;
  open_interest: string;
  yesterday_price: string;
  timestamp: number;
}

export interface WsBookLevel {
  p: string;
  a: string;
  n: number;
}

export interface WsBookUpdate {
  s: string;
  l: [WsBookLevel[], WsBookLevel[]];
  t: number;
  li: number;
}

export interface WsBboUpdate {
  s: string;
  b: string;
  B: string;
  a: string;
  A: string;
  t: number;
  li: number;
}

export interface WsTradeUpdate {
  h: number;
  s: string;
  a: string;
  p: string;
  d: string;
  tc: string;
  t: number;
  li: number;
}

export interface WsPositionUpdate {
  s: string;
  d: "bid" | "ask";
  a: string;
  p: string;
  m: string;
  f: string;
  i: boolean;
  l: string | null;
  t: number;
}

export interface WsAccountInfoUpdate {
  ae: string;
  as: string;
  aw: string;
  b: string;
  f: number;
  mu: string;
  cm: string;
  oc: number;
  pb: string;
  pc: number;
  sc: number;
  t: number;
}

export interface WsMarginUpdate {
  u: string;
  s: string;
  i: boolean;
  t: number;
}

export interface WsLeverageUpdate {
  u: string;
  s: string;
  l: string;
  t: number;
}

export interface WsOrderUpdate {
  i: number;        // order id
  I?: string;       // client order id
  s: string;        // symbol
  d: "bid" | "ask"; // side
  a: string;        // amount
  p: string;        // price
  f: string;        // filled amount
  ro: boolean;      // reduce only
  po: boolean;      // post only
  st: string;       // status (open, filled, cancelled, etc.)
  t: number;        // timestamp
}

type MessageHandler = (msg: WsMessage) => void;

/** Key for deduplicating subscriptions */
function subKey(sub: WsSubscription): string {
  const parts: string[] = [sub.source];
  if (sub.symbol) parts.push(sub.symbol);
  if (sub.account) parts.push(sub.account);
  if (sub.agg_level != null) parts.push(String(sub.agg_level));
  if (sub.interval) parts.push(sub.interval);
  return parts.join("|");
}

export class PacificaWebSocket {
  private _ws: WebSocket | null = null;

  /** Direct access to the underlying WebSocket for sending raw messages */
  get ws(): WebSocket | null { return this._ws; }
  private handlers = new Set<MessageHandler>();
  private subscriptions = new Map<string, WsSubscription>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private account: string | null = null;
  private _isConnected = false;

  get isConnected() {
    return this._isConnected;
  }

  connect(account?: string) {
    this.account = account || null;
    this.doConnect();
  }

  private doConnect() {
    if (this._ws?.readyState === WebSocket.OPEN || this._ws?.readyState === WebSocket.CONNECTING) {
      return;
    }

    try {
      this._ws = new WebSocket(WS_URL);

      this._ws.onopen = () => {
        this._isConnected = true;
        this.reconnectDelay = 1000;
        // Start heartbeat
        this.startPing();
        // Resubscribe
        this.subscriptions.forEach(sub => this.sendSubscribe(sub));
      };

      this._ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          // Ignore pong responses
          if (msg.channel === "pong") return;
          this.handlers.forEach(h => h(msg as WsMessage));
        } catch {
          // ignore malformed
        }
      };

      this._ws.onclose = () => {
        this._isConnected = false;
        this.stopPing();
        this.scheduleReconnect();
      };

      this._ws.onerror = () => {
        this._isConnected = false;
        this._ws?.close();
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private startPing() {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      if (this._ws?.readyState === WebSocket.OPEN) {
        this._ws.send(JSON.stringify({ method: "ping" }));
      }
    }, 30000);
  }

  private stopPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
      this.doConnect();
    }, this.reconnectDelay);
  }

  private sendSubscribe(sub: WsSubscription) {
    if (this._ws?.readyState !== WebSocket.OPEN) return;
    const params: Record<string, unknown> = { source: sub.source };
    if (sub.account) params.account = sub.account;
    if (sub.symbol) params.symbol = sub.symbol;
    if (sub.agg_level != null) params.agg_level = sub.agg_level;
    if (sub.interval) params.interval = sub.interval;
    this._ws.send(JSON.stringify({ method: "subscribe", params }));
  }

  private sendUnsubscribe(sub: WsSubscription) {
    if (this._ws?.readyState !== WebSocket.OPEN) return;
    const params: Record<string, unknown> = { source: sub.source };
    if (sub.account) params.account = sub.account;
    if (sub.symbol) params.symbol = sub.symbol;
    if (sub.agg_level != null) params.agg_level = sub.agg_level;
    if (sub.interval) params.interval = sub.interval;
    this._ws.send(JSON.stringify({ method: "unsubscribe", params }));
  }

  subscribe(sub: WsSubscription) {
    const key = subKey(sub);
    if (this.subscriptions.has(key)) return;
    this.subscriptions.set(key, sub);
    this.sendSubscribe(sub);
  }

  unsubscribe(sub: WsSubscription) {
    const key = subKey(sub);
    if (!this.subscriptions.has(key)) return;
    this.subscriptions.delete(key);
    this.sendUnsubscribe(sub);
  }

  /** Update the account for account-scoped channels */
  setAccount(account: string | null) {
    // Unsub old account channels, resub with new
    const accountChannels = [...this.subscriptions.values()].filter(s => s.account);
    accountChannels.forEach(s => this.sendUnsubscribe(s));
    this.account = account;
    accountChannels.forEach(s => {
      const updated = { ...s, account: account || undefined };
      const oldKey = subKey(s);
      this.subscriptions.delete(oldKey);
      if (account) {
        const newKey = subKey(updated);
        this.subscriptions.set(newKey, updated);
        this.sendSubscribe(updated);
      }
    });
  }

  onMessage(handler: MessageHandler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  disconnect() {
    this.stopPing();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this._ws?.close();
    this._ws = null;
    this._isConnected = false;
    this.subscriptions.clear();
  }
}

// Singleton
export const pacificaWs = new PacificaWebSocket();
