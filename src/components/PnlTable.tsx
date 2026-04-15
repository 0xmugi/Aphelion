import { useState, useMemo } from "react";
import type { Position, PriceInfo, OrderHistoryItem } from "@/lib/pacifica-api";

interface Props {
  positions: Position[];
  prices: PriceInfo[];
  orderHistory: OrderHistoryItem[];
  loading?: boolean;
}

interface PnlRow {
  symbol: string;
  side: "bid" | "ask";
  entryPrice: number;
  markPrice: number;
  amount: number;
  unrealizedPnl: number;
  pnlPercent: number;
  funding: number;
  netPnl: number;
}

interface RealizedTrade {
  symbol: string;
  side: "bid" | "ask";
  entryPrice: number;
  exitPrice: number;
  amount: number;
  realizedPnl: number;
  pnlPercent: number;
  closedAt: number;
}

function computeRealizedTrades(orders: OrderHistoryItem[]): RealizedTrade[] {
  const filled = orders
    .filter(o => o.order_status === "filled" && parseFloat(o.filled_amount) > 0)
    .sort((a, b) => a.created_at - b.created_at);

  const bySymbol: Record<string, OrderHistoryItem[]> = {};
  for (const o of filled) {
    (bySymbol[o.symbol] ||= []).push(o);
  }

  const trades: RealizedTrade[] = [];

  for (const [symbol, symbolOrders] of Object.entries(bySymbol)) {
    const openQueue: { side: "bid" | "ask"; price: number; amount: number }[] = [];

    for (const order of symbolOrders) {
      const amount = parseFloat(order.filled_amount);
      const price = parseFloat(order.average_filled_price);

      if (order.reduce_only) {
        let remaining = amount;
        while (remaining > 0.000000001 && openQueue.length > 0) {
          const open = openQueue[0];
          const matchAmount = Math.min(remaining, open.amount);

          const pnl = open.side === "bid"
            ? (price - open.price) * matchAmount
            : (open.price - price) * matchAmount;

          const notional = open.price * matchAmount;
          const pnlPct = notional > 0 ? (pnl / notional) * 100 : 0;

          trades.push({
            symbol,
            side: open.side,
            entryPrice: open.price,
            exitPrice: price,
            amount: matchAmount,
            realizedPnl: pnl,
            pnlPercent: pnlPct,
            closedAt: order.created_at,
          });

          open.amount -= matchAmount;
          remaining -= matchAmount;
          if (open.amount <= 0.000000001) openQueue.shift();
        }
      } else {
        openQueue.push({ side: order.side, price, amount });
      }
    }
  }

  return trades.sort((a, b) => b.closedAt - a.closedAt);
}

export function PnlTable({ positions, prices, orderHistory, loading }: Props) {
  const [tab, setTab] = useState<"open" | "realized">("open");

  const openRows: PnlRow[] = useMemo(() => {
    return positions.map(pos => {
      const price = prices.find(p => p.symbol === pos.symbol);
      const entryPrice = parseFloat(pos.entry_price);
      const markPrice = price ? parseFloat(price.mark) : entryPrice;
      const amount = parseFloat(pos.amount);
      const notional = amount * entryPrice;
      const unrealizedPnl = (markPrice - entryPrice) * amount * (pos.side === "bid" ? 1 : -1);
      const pnlPercent = notional > 0 ? (unrealizedPnl / notional) * 100 : 0;
      const funding = parseFloat(pos.funding);
      const netPnl = unrealizedPnl + funding;
      return { symbol: pos.symbol, side: pos.side, entryPrice, markPrice, amount, unrealizedPnl, pnlPercent, funding, netPnl };
    });
  }, [positions, prices]);

  const realizedTrades = useMemo(() => computeRealizedTrades(orderHistory), [orderHistory]);

  const totalUnrealized = openRows.reduce((s, r) => s + r.unrealizedPnl, 0);
  const totalFunding = openRows.reduce((s, r) => s + r.funding, 0);
  const totalNet = openRows.reduce((s, r) => s + r.netPnl, 0);
  const totalRealized = realizedTrades.reduce((s, t) => s + t.realizedPnl, 0);

  return (
    <div className="surface-glass rounded-lg overflow-hidden">
      {/* Tab bar - prominent */}
      <div className="flex items-center gap-0 border-b border-border/30">
        <button
          onClick={() => setTab("open")}
          className={`flex-1 sm:flex-none px-6 py-3.5 text-sm font-grotesk font-medium transition-all border-b-2 ${
            tab === "open"
              ? "border-energy-green text-energy-green bg-energy-green/5"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/30"
          }`}
        >
          Open PnL
          <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full font-mono-system ${
            tab === "open" ? "bg-energy-green/15 text-energy-green" : "bg-secondary text-muted-foreground"
          }`}>
            {openRows.length}
          </span>
        </button>
        <button
          onClick={() => setTab("realized")}
          className={`flex-1 sm:flex-none px-6 py-3.5 text-sm font-grotesk font-medium transition-all border-b-2 ${
            tab === "realized"
              ? "border-energy-green text-energy-green bg-energy-green/5"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/30"
          }`}
        >
          Realized PnL
          <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full font-mono-system ${
            tab === "realized" ? "bg-energy-green/15 text-energy-green" : "bg-secondary text-muted-foreground"
          }`}>
            {realizedTrades.length}
          </span>
        </button>

        {/* Summary on the right */}
        <div className="hidden sm:flex ml-auto items-center gap-4 px-4 text-xs font-mono-system">
          {tab === "open" ? (
            <span className="text-muted-foreground">
              Net: <span className={totalNet >= 0 ? "text-energy-green" : "text-risk-red"}>
                {totalNet >= 0 ? "+" : ""}${totalNet.toFixed(2)}
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">
              Total: <span className={totalRealized >= 0 ? "text-energy-green" : "text-risk-red"}>
                {totalRealized >= 0 ? "+" : ""}${totalRealized.toFixed(4)}
              </span>
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-sm text-muted-foreground font-mono-system">Loading...</div>
      ) : tab === "open" ? (
        /* Open Positions Table */
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono-system">
            <thead>
              <tr className="text-muted-foreground text-[0.65rem] font-grotesk tracking-wider uppercase">
                <th className="text-left px-4 py-3">Symbol</th>
                <th className="text-right px-4 py-3">Entry</th>
                <th className="text-right px-4 py-3">Mark</th>
                <th className="text-right px-4 py-3">Size</th>
                <th className="text-right px-4 py-3">Unrealized</th>
                <th className="text-right px-4 py-3">Funding</th>
                <th className="text-right px-4 py-3">Net</th>
              </tr>
            </thead>
            <tbody>
              {openRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-sm text-muted-foreground">
                    No open positions
                  </td>
                </tr>
              ) : (
                openRows.map(row => {
                  const isProfitable = row.unrealizedPnl >= 0;
                  return (
                    <tr key={row.symbol} className="border-t border-border/10 hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${isProfitable ? "bg-energy-green" : "bg-risk-red"}`} />
                          <span className="font-semibold text-foreground">{row.symbol}</span>
                          <span className={`text-[0.6rem] px-1 py-0.5 rounded ${row.side === "bid" ? "bg-energy-green/10 text-energy-green" : "bg-risk-red/10 text-risk-red"}`}>
                            {row.side === "bid" ? "LONG" : "SHORT"}
                          </span>
                        </div>
                      </td>
                      <td className="text-right px-4 py-3 text-muted-foreground">${row.entryPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td className="text-right px-4 py-3">${row.markPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td className="text-right px-4 py-3 text-muted-foreground">{row.amount.toLocaleString()}</td>
                      <td className={`text-right px-4 py-3 ${isProfitable ? "text-energy-green" : "text-risk-red"}`}>
                        {isProfitable ? "+" : ""}{row.unrealizedPnl.toFixed(2)}
                        <span className="text-muted-foreground ml-1 text-[0.6rem]">({row.pnlPercent >= 0 ? "+" : ""}{row.pnlPercent.toFixed(1)}%)</span>
                      </td>
                      <td className={`text-right px-4 py-3 ${row.funding >= 0 ? "text-energy-green/70" : "text-risk-red/70"}`}>
                        {row.funding >= 0 ? "+" : ""}{row.funding.toFixed(2)}
                      </td>
                      <td className={`text-right px-4 py-3 font-semibold ${row.netPnl >= 0 ? "text-energy-green" : "text-risk-red"}`}>
                        {row.netPnl >= 0 ? "+" : ""}{row.netPnl.toFixed(2)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {openRows.length > 0 && (
              <tfoot>
                <tr className="border-t border-border/30 bg-secondary/20">
                  <td colSpan={4} className="text-right px-4 py-3 font-semibold text-muted-foreground font-grotesk text-[0.65rem] tracking-wider uppercase">Total</td>
                  <td className={`text-right px-4 py-3 font-semibold ${totalUnrealized >= 0 ? "text-energy-green" : "text-risk-red"}`}>
                    {totalUnrealized >= 0 ? "+" : ""}{totalUnrealized.toFixed(2)}
                  </td>
                  <td className={`text-right px-4 py-3 font-semibold ${totalFunding >= 0 ? "text-energy-green/70" : "text-risk-red/70"}`}>
                    {totalFunding >= 0 ? "+" : ""}{totalFunding.toFixed(2)}
                  </td>
                  <td className={`text-right px-4 py-3 font-bold ${totalNet >= 0 ? "text-energy-green" : "text-risk-red"}`}>
                    {totalNet >= 0 ? "+" : ""}{totalNet.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      ) : (
        /* Realized PnL Table */
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono-system">
            <thead>
              <tr className="text-muted-foreground text-[0.65rem] font-grotesk tracking-wider uppercase">
                <th className="text-left px-4 py-3">Symbol</th>
                <th className="text-right px-4 py-3">Entry</th>
                <th className="text-right px-4 py-3">Exit</th>
                <th className="text-right px-4 py-3">Size</th>
                <th className="text-right px-4 py-3">PnL</th>
                <th className="text-right px-4 py-3">Time</th>
              </tr>
            </thead>
            <tbody>
              {realizedTrades.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-sm text-muted-foreground">
                    No closed trades found
                  </td>
                </tr>
              ) : (
                realizedTrades.map((trade, i) => {
                  const isProfitable = trade.realizedPnl >= 0;
                  const d = new Date(trade.closedAt);
                  const timeStr = `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
                  return (
                    <tr key={`${trade.symbol}-${trade.closedAt}-${i}`} className="border-t border-border/10 hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${isProfitable ? "bg-energy-green" : "bg-risk-red"}`} />
                          <span className="font-semibold text-foreground">{trade.symbol}</span>
                          <span className={`text-[0.6rem] px-1 py-0.5 rounded ${trade.side === "bid" ? "bg-energy-green/10 text-energy-green" : "bg-risk-red/10 text-risk-red"}`}>
                            {trade.side === "bid" ? "LONG" : "SHORT"}
                          </span>
                        </div>
                      </td>
                      <td className="text-right px-4 py-3 text-muted-foreground">${trade.entryPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td className="text-right px-4 py-3">${trade.exitPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td className="text-right px-4 py-3 text-muted-foreground">{trade.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })}</td>
                      <td className={`text-right px-4 py-3 font-semibold ${isProfitable ? "text-energy-green" : "text-risk-red"}`}>
                        {isProfitable ? "+" : ""}${Math.abs(trade.realizedPnl).toFixed(4)}
                        <span className="text-muted-foreground ml-1 text-[0.6rem]">({trade.pnlPercent >= 0 ? "+" : ""}{trade.pnlPercent.toFixed(1)}%)</span>
                      </td>
                      <td className="text-right px-4 py-3 text-muted-foreground text-[0.65rem]">{timeStr}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {realizedTrades.length > 0 && (
              <tfoot>
                <tr className="border-t border-border/30 bg-secondary/20">
                  <td colSpan={4} className="text-right px-4 py-3 font-semibold text-muted-foreground font-grotesk text-[0.65rem] tracking-wider uppercase">Total Realized</td>
                  <td className={`text-right px-4 py-3 font-bold ${totalRealized >= 0 ? "text-energy-green" : "text-risk-red"}`}>
                    {totalRealized >= 0 ? "+" : ""}${Math.abs(totalRealized).toFixed(4)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}
