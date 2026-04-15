import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useWebSocket } from "@/hooks/use-websocket";
import type { WsPriceUpdate, WsPositionUpdate, WsAccountInfoUpdate, WsBookUpdate, WsTradeUpdate, WsOrderUpdate, WsSubscription } from "@/lib/pacifica-ws";
import type { HistoricalOrder } from "@/components/OrderHistory";
import type { AccountInfo, Position, PriceInfo, PortfolioPoint, FundingEvent, OrderbookData } from "@/lib/pacifica-api";
import { pacificaApi } from "@/lib/pacifica-api";

// Demo data for when no wallet is connected
const DEMO_ACCOUNT: AccountInfo = {
  balance: "52480.000000",
  fee_level: 2,
  maker_fee: "0.00015",
  taker_fee: "0.0004",
  account_equity: "61046.308885",
  available_to_spend: "38200.750000",
  available_to_withdraw: "32500.850000",
  pending_balance: "0.000000",
  total_margin_used: "22845.558885",
  cross_mmr: "15420.690000",
  positions_count: 5,
  orders_count: 8,
  stop_orders_count: 2,
  updated_at: Date.now(),
};

const DEMO_POSITIONS: Position[] = [
  { symbol: "BTC", side: "bid", amount: "0.45", entry_price: "104250.00", margin: "0", funding: "-42.35", isolated: false, liquidation_price: "83400.00", created_at: Date.now() - 86400000 * 3, updated_at: Date.now() },
  { symbol: "ETH", side: "bid", amount: "12.8", entry_price: "3180.50", margin: "0", funding: "-18.92", isolated: false, liquidation_price: "2540.00", created_at: Date.now() - 86400000 * 5, updated_at: Date.now() },
  { symbol: "SOL", side: "ask", amount: "580", entry_price: "178.42", margin: "8500", funding: "156.20", isolated: true, liquidation_price: "215.00", created_at: Date.now() - 86400000 * 2, updated_at: Date.now() },
  { symbol: "AAVE", side: "ask", amount: "223.72", entry_price: "279.28", margin: "0", funding: "13.16", isolated: false, liquidation_price: null, created_at: Date.now() - 86400000 * 7, updated_at: Date.now() },
  { symbol: "DOGE", side: "bid", amount: "450000", entry_price: "0.1842", margin: "4200", funding: "-8.45", isolated: true, liquidation_price: "0.1200", created_at: Date.now() - 86400000, updated_at: Date.now() },
];

const DEMO_PRICES: PriceInfo[] = [
  { symbol: "BTC", funding: "0.00008", mark: "105120.50", mid: "105118.00", next_funding: "0.00009", open_interest: "892000000", oracle: "105115.00", timestamp: Date.now(), volume_24h: "2450000000", yesterday_price: "103800.00" },
  { symbol: "ETH", funding: "0.00012", mark: "3245.80", mid: "3245.50", next_funding: "0.00014", open_interest: "445000000", oracle: "3244.20", timestamp: Date.now(), volume_24h: "890000000", yesterday_price: "3190.00" },
  { symbol: "SOL", funding: "-0.00015", mark: "172.35", mid: "172.30", next_funding: "-0.00012", open_interest: "234000000", oracle: "172.28", timestamp: Date.now(), volume_24h: "567000000", yesterday_price: "176.80" },
  { symbol: "AAVE", funding: "0.00005", mark: "285.40", mid: "285.20", next_funding: "0.00006", open_interest: "45000000", oracle: "285.10", timestamp: Date.now(), volume_24h: "78000000", yesterday_price: "278.50" },
  { symbol: "DOGE", funding: "0.00025", mark: "0.1920", mid: "0.1918", next_funding: "0.00028", open_interest: "120000000", oracle: "0.1917", timestamp: Date.now(), volume_24h: "340000000", yesterday_price: "0.1850" },
];

function generatePortfolio(): PortfolioPoint[] {
  const points: PortfolioPoint[] = [];
  const now = Date.now();
  let equity = 48000;
  let pnl = 0;
  for (let i = 168; i >= 0; i--) {
    const delta = (Math.random() - 0.45) * 800;
    equity += delta;
    pnl += delta;
    points.push({
      account_equity: equity.toFixed(6),
      pnl: pnl.toFixed(6),
      timestamp: now - i * 3600000,
    });
  }
  return points;
}

function generateFunding(): FundingEvent[] {
  const events: FundingEvent[] = [];
  const symbols = ["BTC", "ETH", "SOL", "AAVE", "DOGE"];
  for (let i = 0; i < 50; i++) {
    const sym = symbols[Math.floor(Math.random() * symbols.length)];
    events.push({
      history_id: 2287920 + i,
      symbol: sym,
      side: Math.random() > 0.5 ? "bid" : "ask",
      amount: (Math.random() * 10000).toFixed(0),
      payout: ((Math.random() - 0.4) * 20).toFixed(6),
      rate: (Math.random() * 0.0003).toFixed(7),
      created_at: Date.now() - i * 3600000,
    });
  }
  return events;
}

const DEMO_PORTFOLIO = generatePortfolio();
const DEMO_FUNDING = generateFunding();

export interface TradingData {
  account: AccountInfo;
  positions: Position[];
  prices: PriceInfo[];
  portfolio: PortfolioPoint[];
  funding: FundingEvent[];
  efficiencyScore: number;
  alerts: SmartAlert[];
  wsConnected: boolean;
  orderbook: OrderbookData | null;
  recentTrades: WsTradeUpdate[];
  openOrders: WsOrderUpdate[];
  orderHistory: HistoricalOrder[];
  isLive: boolean;
}

export interface SmartAlert {
  id: string;
  type: "over-margined" | "funding-bleed" | "idle-capital" | "leverage-inefficient";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  detail: string;
  symbol?: string;
}

function calculateEfficiencyScore(account: AccountInfo, positions: Position[], _prices: PriceInfo[]): number {
  const equity = parseFloat(account.account_equity);
  const marginUsed = parseFloat(account.total_margin_used);
  const available = parseFloat(account.available_to_spend);

  const utilization = marginUsed / equity;
  const utilizationScore = utilization > 0.8 ? 60 : utilization > 0.5 ? 85 : utilization > 0.3 ? 70 : 50;

  const idleRatio = available / equity;
  const idleScore = idleRatio > 0.6 ? 40 : idleRatio > 0.4 ? 60 : idleRatio > 0.2 ? 80 : 90;

  const totalFunding = positions.reduce((sum, p) => sum + Math.abs(parseFloat(p.funding)), 0);
  const fundingDrag = totalFunding / equity;
  const fundingScore = fundingDrag > 0.01 ? 50 : fundingDrag > 0.005 ? 70 : 90;

  return Math.round(utilizationScore * 0.35 + idleScore * 0.35 + fundingScore * 0.3);
}

function generateAlerts(account: AccountInfo, positions: Position[], prices: PriceInfo[]): SmartAlert[] {
  const alerts: SmartAlert[] = [];
  const equity = parseFloat(account.account_equity);
  const marginUsed = parseFloat(account.total_margin_used);
  const available = parseFloat(account.available_to_spend);

  if (marginUsed / equity > 0.6) {
    alerts.push({
      id: "over-margin",
      type: "over-margined",
      severity: marginUsed / equity > 0.8 ? "critical" : "high",
      message: "Over-margined",
      detail: `${((marginUsed / equity) * 100).toFixed(1)}% of equity locked in margin. Consider reducing leverage.`,
    });
  }

  const negFunding = positions.filter(p => parseFloat(p.funding) < -10);
  if (negFunding.length > 0) {
    const totalBleed = negFunding.reduce((s, p) => s + Math.abs(parseFloat(p.funding)), 0);
    alerts.push({
      id: "funding-bleed",
      type: "funding-bleed",
      severity: totalBleed > 100 ? "high" : "medium",
      message: "Funding bleed detected",
      detail: `$${totalBleed.toFixed(2)} in funding costs across ${negFunding.length} position(s).`,
      symbol: negFunding[0].symbol,
    });
  }

  if (available / equity > 0.5) {
    alerts.push({
      id: "idle-capital",
      type: "idle-capital",
      severity: "medium",
      message: "Idle capital detected",
      detail: `$${available.toFixed(0)} (${((available / equity) * 100).toFixed(0)}%) sitting unused. Consider deploying or withdrawing.`,
    });
  }

  positions.forEach(pos => {
    const price = prices.find(p => p.symbol === pos.symbol);
    if (price) {
      const change24h = Math.abs((parseFloat(price.mark) - parseFloat(price.yesterday_price)) / parseFloat(price.yesterday_price));
      if (change24h < 0.01 && parseFloat(pos.amount) * parseFloat(pos.entry_price) > 5000) {
        alerts.push({
          id: `leverage-${pos.symbol}`,
          type: "leverage-inefficient",
          severity: "low",
          message: `${pos.symbol} leverage inefficient`,
          detail: `Low volatility (${(change24h * 100).toFixed(2)}% 24h) with significant margin locked.`,
          symbol: pos.symbol,
        });
      }
    }
  });

  return alerts;
}

export function useTradingData(walletAddress: string | null, selectedSymbol?: string | null) {
  const [data, setData] = useState<TradingData | null>(null);
  const fetchedForRef = useRef<string | null>(null);

  // Build subscriptions list
  const subscriptions = useMemo<WsSubscription[]>(() => {
    const subs: WsSubscription[] = [{ source: "prices" }];
    const bookSymbol = selectedSymbol || "BTC";
    subs.push({ source: "book", symbol: bookSymbol, agg_level: 1 });

    // Subscribe to trades for major symbols
    const symbols = new Set(["BTC", "ETH", "SOL"]);
    symbols.forEach(s => subs.push({ source: "trades", symbol: s }));

    if (walletAddress) {
      subs.push({ source: "account_positions", account: walletAddress });
      subs.push({ source: "account_info", account: walletAddress });
      subs.push({ source: "account_order_updates", account: walletAddress });
    }
    return subs;
  }, [walletAddress, selectedSymbol]);

  // WS handlers
  const handlePriceUpdate = useCallback((wsPrices: WsPriceUpdate[]) => {
    setData(prev => {
      if (!prev) return prev;
      // Merge WS prices — add new symbols from WS that aren't in our list yet
      const updatedPrices = [...prev.prices];
      for (const ws of wsPrices) {
        const idx = updatedPrices.findIndex(p => p.symbol === ws.symbol);
        if (idx >= 0) {
          updatedPrices[idx] = { ...updatedPrices[idx], mark: ws.mark, mid: ws.mid, funding: ws.funding, next_funding: ws.next_funding, oracle: ws.oracle, volume_24h: ws.volume_24h, open_interest: ws.open_interest, timestamp: ws.timestamp, yesterday_price: ws.yesterday_price || updatedPrices[idx].yesterday_price };
        } else {
          // New symbol from WS
          updatedPrices.push({
            symbol: ws.symbol,
            mark: ws.mark,
            mid: ws.mid,
            funding: ws.funding,
            next_funding: ws.next_funding,
            oracle: ws.oracle,
            volume_24h: ws.volume_24h,
            open_interest: ws.open_interest,
            timestamp: ws.timestamp,
            yesterday_price: ws.yesterday_price || ws.mark,
          });
        }
      }
      return { ...prev, prices: updatedPrices, efficiencyScore: calculateEfficiencyScore(prev.account, prev.positions, updatedPrices), alerts: generateAlerts(prev.account, prev.positions, updatedPrices) };
    });
  }, []);

  const handlePositionUpdate = useCallback((wsPositions: WsPositionUpdate[]) => {
    setData(prev => {
      if (!prev) return prev;
      // If WS sends empty array, positions were closed
      if (wsPositions.length === 0) {
        return { ...prev, positions: [], efficiencyScore: calculateEfficiencyScore(prev.account, [], prev.prices), alerts: generateAlerts(prev.account, [], prev.prices) };
      }
      // Build updated positions from WS data (this is a snapshot)
      const updatedPositions = wsPositions.map(ws => {
        const existing = prev.positions.find(p => p.symbol === ws.s);
        return {
          symbol: ws.s,
          side: ws.d,
          amount: ws.a,
          entry_price: ws.p,
          margin: ws.m,
          funding: ws.f,
          isolated: ws.i,
          liquidation_price: ws.l || null,
          created_at: existing?.created_at || ws.t,
          updated_at: ws.t,
        } as Position;
      });
      return { ...prev, positions: updatedPositions, efficiencyScore: calculateEfficiencyScore(prev.account, updatedPositions, prev.prices), alerts: generateAlerts(prev.account, updatedPositions, prev.prices) };
    });
  }, []);

  const handleAccountInfoUpdate = useCallback((info: WsAccountInfoUpdate) => {
    setData(prev => {
      if (!prev) return prev;
      const updatedAccount: AccountInfo = {
        ...prev.account,
        account_equity: info.ae,
        available_to_spend: info.as,
        available_to_withdraw: info.aw,
        balance: info.b,
        fee_level: info.f,
        total_margin_used: info.mu,
        cross_mmr: info.cm,
        orders_count: info.oc,
        pending_balance: info.pb,
        positions_count: info.pc,
        stop_orders_count: info.sc,
        updated_at: info.t,
      };
      return { ...prev, account: updatedAccount, efficiencyScore: calculateEfficiencyScore(updatedAccount, prev.positions, prev.prices), alerts: generateAlerts(updatedAccount, prev.positions, prev.prices) };
    });
  }, []);

  const handleBookUpdate = useCallback((book: WsBookUpdate) => {
    setData(prev => {
      if (!prev) return prev;
      const orderbook: OrderbookData = { s: book.s, l: book.l, t: book.t };
      return { ...prev, orderbook };
    });
  }, []);

  const handleTradeUpdate = useCallback((trades: WsTradeUpdate[]) => {
    setData(prev => {
      if (!prev) return prev;
      const updated = [...prev.recentTrades, ...trades].slice(-100);
      return { ...prev, recentTrades: updated };
    });
  }, []);

  const handleOrderUpdate = useCallback((order: WsOrderUpdate) => {
    setData(prev => {
      if (!prev) return prev;
      const orders = [...prev.openOrders];
      const history = [...prev.orderHistory];
      const idx = orders.findIndex(o => o.i === order.i);

      if (order.st === "cancelled" || order.st === "filled") {
        if (idx >= 0) orders.splice(idx, 1);
        // Add to history
        history.unshift({
          i: order.i,
          s: order.s,
          d: order.d,
          a: order.a,
          p: order.p,
          ep: order.st === "filled" ? order.p : undefined,
          f: order.f,
          st: order.st as "filled" | "cancelled",
          t: order.t,
          ft: Date.now(),
        });
        // Keep last 50
        if (history.length > 50) history.length = 50;
      } else if (idx >= 0) {
        orders[idx] = order;
      } else {
        orders.push(order);
      }
      return { ...prev, openOrders: orders, orderHistory: history };
    });
  }, []);

  const { isConnected } = useWebSocket({
    account: walletAddress,
    subscriptions,
    onPriceUpdate: handlePriceUpdate,
    onPositionUpdate: handlePositionUpdate,
    onAccountInfoUpdate: handleAccountInfoUpdate,
    onBookUpdate: handleBookUpdate,
    onTradeUpdate: handleTradeUpdate,
    onOrderUpdate: handleOrderUpdate,
  });

  // Fetch real data from Pacifica API when wallet connects
  useEffect(() => {
    if (walletAddress && fetchedForRef.current !== walletAddress) {
      fetchedForRef.current = walletAddress;

      // Fetch real data in parallel
      Promise.all([
        pacificaApi.getAccount(walletAddress).catch(() => null),
        pacificaApi.getPositions(walletAddress).catch(() => null),
        pacificaApi.getPrices().catch(() => null),
        pacificaApi.getPortfolio(walletAddress).catch(() => null),
        pacificaApi.getFundingHistory(walletAddress).catch(() => null),
      ]).then(([account, positions, prices, portfolio, funding]) => {
        // Use real data even if account doesn't exist yet (new wallet, no deposits)
        const realPrices = prices || [];
        if (realPrices.length === 0) return;

        const realAccount: AccountInfo = account || {
          balance: "0.000000",
          fee_level: 0,
          maker_fee: "0.00020",
          taker_fee: "0.00050",
          account_equity: "0.000000",
          available_to_spend: "0.000000",
          available_to_withdraw: "0.000000",
          pending_balance: "0.000000",
          total_margin_used: "0.000000",
          cross_mmr: "0.000000",
          positions_count: 0,
          orders_count: 0,
          stop_orders_count: 0,
          updated_at: Date.now(),
        };
        const realPositions = positions || [];
        const realPortfolio = portfolio && portfolio.length > 0 ? portfolio : [];
        const realFunding = funding && funding.length > 0 ? funding : [];
        const efficiencyScore = calculateEfficiencyScore(realAccount, realPositions, realPrices);
        const alerts = generateAlerts(realAccount, realPositions, realPrices);

        setData(prev => ({
          account: realAccount,
          positions: realPositions,
          prices: realPrices,
          portfolio: realPortfolio,
          funding: realFunding,
          efficiencyScore,
          alerts,
          wsConnected: prev?.wsConnected ?? false,
          orderbook: prev?.orderbook ?? null,
          recentTrades: prev?.recentTrades ?? [],
          openOrders: prev?.openOrders ?? [],
          orderHistory: prev?.orderHistory ?? [],
          isLive: true,
        }));
      });
    }

    // If no wallet, load demo data
    if (!walletAddress) {
      fetchedForRef.current = null;
      const account = DEMO_ACCOUNT;
      const positions = DEMO_POSITIONS;
      const prices = DEMO_PRICES;
      const portfolio = DEMO_PORTFOLIO;
      const funding = DEMO_FUNDING;
      const efficiencyScore = calculateEfficiencyScore(account, positions, prices);
      const alerts = generateAlerts(account, positions, prices);

      setData({ account, positions, prices, portfolio, funding, efficiencyScore, alerts, wsConnected: false, orderbook: null, recentTrades: [], openOrders: [], orderHistory: [], isLive: false });
    }
  }, [walletAddress]);

  // Initialize with demo data immediately
  useEffect(() => {
    if (!data) {
      const account = DEMO_ACCOUNT;
      const positions = DEMO_POSITIONS;
      const prices = DEMO_PRICES;
      const efficiencyScore = calculateEfficiencyScore(account, positions, prices);
      const alerts = generateAlerts(account, positions, prices);
      setData({ account, positions, prices, portfolio: DEMO_PORTFOLIO, funding: DEMO_FUNDING, efficiencyScore, alerts, wsConnected: false, orderbook: null, recentTrades: [], openOrders: [], orderHistory: [], isLive: false });
    }
  }, []);

  // Simulate equity drift only when using demo data
  useEffect(() => {
    if (data?.isLive) return;
    const interval = setInterval(() => {
      setData(prev => {
        if (!prev || prev.isLive) return prev;
        const eq = parseFloat(prev.account.account_equity);
        const newEq = eq + (Math.random() - 0.48) * 50;
        return {
          ...prev,
          account: { ...prev.account, account_equity: newEq.toFixed(6) },
          efficiencyScore: calculateEfficiencyScore(
            { ...prev.account, account_equity: newEq.toFixed(6) },
            prev.positions,
            prev.prices
          ),
        };
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [data?.isLive]);

  // Sync WS connection status
  useEffect(() => {
    setData(prev => prev ? { ...prev, wsConnected: isConnected } : prev);
  }, [isConnected]);

  return data;
}
