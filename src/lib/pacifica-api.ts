const API_BASE = "https://api.pacifica.fi/api/v1";

export interface AccountInfo {
  balance: string;
  fee_level: number;
  maker_fee: string;
  taker_fee: string;
  account_equity: string;
  available_to_spend: string;
  available_to_withdraw: string;
  pending_balance: string;
  total_margin_used: string;
  cross_mmr: string;
  positions_count: number;
  orders_count: number;
  stop_orders_count: number;
  updated_at: number;
}

export interface Position {
  symbol: string;
  side: "bid" | "ask";
  amount: string;
  entry_price: string;
  margin: string;
  funding: string;
  isolated: boolean;
  liquidation_price: string | null;
  created_at: number;
  updated_at: number;
}

export interface PriceInfo {
  symbol: string;
  funding: string;
  mark: string;
  mid: string;
  next_funding: string;
  open_interest: string;
  oracle: string;
  timestamp: number;
  volume_24h: string;
  yesterday_price: string;
}

export interface PortfolioPoint {
  account_equity: string;
  pnl: string;
  timestamp: number;
}

export interface BalanceEvent {
  amount: string;
  balance: string;
  pending_balance: string;
  event_type: string;
  created_at: number;
}

export interface FundingEvent {
  history_id: number;
  symbol: string;
  side: string;
  amount: string;
  payout: string;
  rate: string;
  created_at: number;
}

export interface OrderbookLevel {
  p: string; // price
  a: string; // amount
  n: number; // order count
}

export interface OrderbookData {
  s: string;
  l: [OrderbookLevel[], OrderbookLevel[]]; // [bids, asks]
  t: number;
}

export interface OrderHistoryItem {
  price: string;
  history_id: number;
  initial_amount: string;
  order_id: number;
  client_order_id: string | null;
  symbol: string;
  side: "bid" | "ask";
  initial_price: string;
  average_filled_price: string;
  amount: string;
  filled_amount: string;
  order_status: string;
  order_type: string;
  stop_price: string | null;
  stop_parent_order_id: number | null;
  reduce_only: boolean;
  trigger_price_type: string | null;
  reason: string | null;
  instrument_type: string;
  created_at: number;
  updated_at: number;
}

export interface Candle {
  t: number;  // start time
  T: number;  // end time
  s: string;
  i: string;
  o: string;  // open
  c: string;  // close
  h: string;  // high
  l: string;  // low
  v: string;  // volume
  n: number;
}

export interface OrderHistoryEvent {
  history_id: number;
  order_id: number;
  client_order_id: string | null;
  symbol: string;
  side: "bid" | "ask";
  price: string;
  initial_amount: string;
  filled_amount: string;
  cancelled_amount: string;
  event_type: string;
  order_type: string;
  order_status: string;
  stop_price: string | null;
  stop_parent_order_id: number | null;
  reduce_only: boolean;
  trigger_price_type: string | null;
  instrument_type: string;
  created_at: number;
}

async function apiGet<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${API_BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const res = await fetch(url.toString(), { headers: { Accept: "*/*" } });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "API Error");
  return json.data;
}

export const pacificaApi = {
  getAccount: (account: string) =>
    apiGet<AccountInfo>("/account", { account }),

  getPositions: (account: string) =>
    apiGet<Position[]>("/positions", { account }),

  getPrices: () =>
    apiGet<PriceInfo[]>("/info/prices"),

  getPortfolio: (account: string, timeRange: string = "7d") =>
    apiGet<PortfolioPoint[]>("/portfolio", { account, time_range: timeRange }),

  getBalanceHistory: (account: string, limit: string = "100") =>
    apiGet<BalanceEvent[]>("/account/balance/history", { account, limit }),

  getFundingHistory: (account: string, limit: string = "100") =>
    apiGet<FundingEvent[]>("/funding/history", { account, limit }),

  getOrderHistory: (account: string, limit: string = "100") =>
    apiGet<OrderHistoryItem[]>("/orders/history", { account, limit }),

  getOrderbook: (symbol: string, aggLevel: number = 1) =>
    apiGet<OrderbookData>("/book", { symbol, agg_level: aggLevel.toString() }),

  getKline: (symbol: string, interval: string = "1h", startTime?: number, limit?: number) => {
    const start = startTime || Date.now() - 24 * 3600000; // default 24h ago
    return apiGet<Candle[]>("/kline", { symbol, interval, start_time: start.toString() });
  },

    getOrderHistoryById: (orderId: number) =>
    apiGet<OrderHistoryEvent[]>("/orders/history_by_id", {
      order_id: orderId.toString(),
    }),
};

// Signing utilities for wallet-based auth
export function sortJsonKeys(value: unknown): unknown {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = sortJsonKeys((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  if (Array.isArray(value)) return value.map(sortJsonKeys);
  return value;
}

export function buildSignaturePayload(
  type: string,
  data: Record<string, unknown>,
  expiryWindow: number = 5000
) {
  const timestamp = Date.now();
  const payload = { timestamp, expiry_window: expiryWindow, type, data };
  const sorted = sortJsonKeys(payload);
  const compact = JSON.stringify(sorted, null, 0).replace(/\n/g, "");
  return { payload: sorted, compact, timestamp, expiryWindow };
}
