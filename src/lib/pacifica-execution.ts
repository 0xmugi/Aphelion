import { sortJsonKeys, buildSignaturePayload } from "./pacifica-api";

const API_BASE = "https://api.pacifica.fi/api/v1";

// Lot sizes per symbol — amount must be a multiple of this
const LOT_SIZES: Record<string, number> = {
  BTC: 0.00001, ETH: 0.0001, SOL: 0.01, DOGE: 1, AAVE: 0.01,
  BNB: 0.001, XRP: 0.1, LTC: 0.001, AVAX: 0.01, LINK: 0.01,
  SUI: 0.1, DOT: 0.01, ADA: 1, MATIC: 1, ARB: 0.1,
  OP: 0.1, APT: 0.01, INJ: 0.01, TIA: 0.01, SEI: 1,
  JUP: 0.1, WIF: 0.1, PEPE: 1000, BONK: 1000, TRUMP: 0.01,
  HYPE: 0.01, TAO: 0.001, NEAR: 0.1, FIL: 0.01, RENDER: 0.1,
  ENA: 1, CRV: 1, LDO: 0.1, MKR: 0.0001, UNI: 0.1,
  STX: 0.1, ZRO: 0.1, STRK: 0.1, W: 1, ZK: 1,
  PAXG: 0.0001, PENGU: 1, PIPPIN: 1, WLD: 0.1, VIRTUAL: 0.1,
  FARTCOIN: 1, PUMP: 1, MEGA: 0.01, NAT: 1, URN: 1, WLFI: 1,
  TSLA: 0.01, SP500: 0.001, GOOGL: 0.01, HOOD: 0.01, PLTR: 0.01,
  XAU: 0.001, XAG: 0.01, COPPER: 0.1, PLATINUM: 0.01, GAS: 0.1,
  EURUSD: 1, USDJPY: 1, BCH: 0.001, ICP: 0.01, NVD: 0.01,
  XMR: 0.001, ZEC: 0.01, LIT: 0.1, CL: 0.01, CR: 0.1,
};

/** Round amount down to the nearest valid lot size */
export function roundToLotSize(amount: string, symbol: string): string {
  const lot = LOT_SIZES[symbol] || 0.00001;
  const val = parseFloat(amount);
  if (isNaN(val) || val <= 0) return amount;
  const decimals = Math.max(0, -Math.floor(Math.log10(lot)));
  const rounded = Math.floor(val / lot) * lot;
  return rounded.toFixed(decimals);
}

export interface ExecutionResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

type SignMessageFn = (message: string) => Promise<Uint8Array | null>;

// ── REST-based signed request ──

async function signedRequest(
  path: string,
  type: string,
  data: Record<string, unknown>,
  account: string,
  signMessage: SignMessageFn,
): Promise<ExecutionResult> {
  const { compact, timestamp } = buildSignaturePayload(type, data);

  const sigBytes = await signMessage(compact);
  if (!sigBytes) {
    return { success: false, error: "Wallet signing rejected" };
  }

  const bs58 = await import("bs58");
  const signature = bs58.default.encode(sigBytes);

  const body: Record<string, unknown> = {
    account,
    signature,
    timestamp,
    expiry_window: 5000,
    ...data,
  };

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "*/*" },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    let json: Record<string, unknown>;
    try {
      json = JSON.parse(text);
    } catch {
      return { success: false, error: text || `HTTP ${res.status}` };
    }

    if (json.error) {
      return { success: false, error: String(json.error) };
    }
    if (json.order_id) {
      return { success: true, data: { i: json.order_id } };
    }
    if (json.success === false) {
      return { success: false, error: String(json.error || "API error") };
    }
    return { success: true, data: json.data || json };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ── Market Order ──

export interface MarketOrderParams {
  account: string;
  symbol: string;
  side: "bid" | "ask";
  amount: string;
  reduceOnly?: boolean;
  slippagePercent?: string;
  clientOrderId?: string;
  takeProfit?: { stopPrice: string; limitPrice?: string };
  stopLoss?: { stopPrice: string; limitPrice?: string };
}

export async function createMarketOrder(
  params: MarketOrderParams,
  signMessage: SignMessageFn,
): Promise<ExecutionResult> {
  const clientOrderId = params.clientOrderId || crypto.randomUUID();

  const body: Record<string, unknown> = {
    symbol: params.symbol,
    side: params.side,
    amount: params.amount,
    reduce_only: params.reduceOnly ?? false,
    slippage_percent: params.slippagePercent || "0.5",
    client_order_id: clientOrderId,
  };

  if (params.takeProfit) {
    body.take_profit = {
      stop_price: params.takeProfit.stopPrice,
      ...(params.takeProfit.limitPrice && { limit_price: params.takeProfit.limitPrice }),
    };
  }
  if (params.stopLoss) {
    body.stop_loss = {
      stop_price: params.stopLoss.stopPrice,
      ...(params.stopLoss.limitPrice && { limit_price: params.stopLoss.limitPrice }),
    };
  }

  return signedRequest(
    "/orders/create_market",
    "create_market_order",
    body,
    params.account,
    signMessage,
  );
}

// ── Leverage (REST) ──

export async function reduceLeverage(
  account: string,
  symbol: string,
  newLeverage: number,
  signMessage: SignMessageFn,
): Promise<ExecutionResult> {
  return signedRequest(
    "/account/leverage",
    "update_leverage",
    { symbol, leverage: newLeverage },
    account,
    signMessage,
  );
}

export async function shiftMarginMode(
  account: string,
  symbol: string,
  toIsolated: boolean,
  margin?: string,
  signMessage?: SignMessageFn,
): Promise<ExecutionResult> {
  if (!signMessage) return { success: false, error: "No wallet" };
  const data: Record<string, unknown> = { symbol, is_isolated: toIsolated };
  if (toIsolated && margin) data.margin = margin;
  return signedRequest("/account/margin", "update_margin_mode", data, account, signMessage);
}

// ── Limit Order ──

export interface LimitOrderParams {
  account: string;
  symbol: string;
  side: "bid" | "ask";
  amount: string;
  price: string;
  reduceOnly?: boolean;
  postOnly?: boolean;
  clientOrderId?: string;
  takeProfit?: { stopPrice: string; limitPrice?: string };
  stopLoss?: { stopPrice: string; limitPrice?: string };
}

export async function createLimitOrder(
  params: LimitOrderParams,
  signMessage: SignMessageFn,
): Promise<ExecutionResult> {
  const clientOrderId = params.clientOrderId || crypto.randomUUID();

  const body: Record<string, unknown> = {
    symbol: params.symbol,
    side: params.side,
    amount: params.amount,
    price: params.price,
    reduce_only: params.reduceOnly ?? false,
    tif: params.postOnly ? "ALO" : "GTC",
    client_order_id: clientOrderId,
  };

  if (params.takeProfit) {
    body.take_profit = {
      stop_price: params.takeProfit.stopPrice,
      ...(params.takeProfit.limitPrice && { limit_price: params.takeProfit.limitPrice }),
    };
  }
  if (params.stopLoss) {
    body.stop_loss = {
      stop_price: params.stopLoss.stopPrice,
      ...(params.stopLoss.limitPrice && { limit_price: params.stopLoss.limitPrice }),
    };
  }

  return signedRequest(
    "/orders/create",
    "create_order",
    body,
    params.account,
    signMessage,
  );
}

// ── Cancel Order ──

export async function cancelOrder(
  account: string,
  symbol: string,
  orderId: number,
  signMessage: SignMessageFn,
): Promise<ExecutionResult> {
  return signedRequest(
    "/orders/cancel",
    "cancel_order",
    { symbol, order_id: orderId },
    account,
    signMessage,
  );
}

// ── Close Position (market order with reduce_only) ──

export async function closePosition(
  account: string,
  symbol: string,
  side: "bid" | "ask",
  amount: string,
  signMessage: SignMessageFn,
): Promise<ExecutionResult> {
  return createMarketOrder(
    {
      account,
      symbol,
      side: side === "bid" ? "ask" : "bid",
      amount,
      reduceOnly: true,
      slippagePercent: "1.0",
    },
    signMessage,
  );
}
