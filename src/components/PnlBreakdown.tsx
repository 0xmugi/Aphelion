import { useState, useEffect, useMemo } from "react";
import { pacificaApi } from "@/lib/pacifica-api";
import type { Position, PriceInfo, PortfolioPoint, OrderHistoryItem, AccountInfo } from "@/lib/pacifica-api";
import { PnlStatsCards } from "@/components/PnlStatsCards";
import { PnlChart } from "@/components/PnlChart";
import { PnlTable } from "@/components/PnlTable";

interface Props {
  positions: Position[];
  prices: PriceInfo[];
  account: string | null;
}

export function PnlBreakdown({ positions, prices, account }: Props) {
  const [portfolio, setPortfolio] = useState<PortfolioPoint[]>([]);
  const [orderHistory, setOrderHistory] = useState<OrderHistoryItem[]>([]);
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [timeRange, setTimeRange] = useState("7d");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!account) return;
    setLoading(true);
    Promise.all([
      pacificaApi.getPortfolio(account, timeRange).catch(() => [] as PortfolioPoint[]),
      pacificaApi.getOrderHistory(account, "200").catch(() => [] as OrderHistoryItem[]),
      pacificaApi.getAccount(account).catch(() => null),
    ]).then(([port, orders, acct]) => {
      setPortfolio(port);
      setOrderHistory(orders);
      setAccountInfo(acct);
    }).finally(() => setLoading(false));
  }, [account, timeRange]);

  const stats = useMemo(() => {
    if (!accountInfo || !portfolio.length) {
      return { equity: 0, pnl: 0, volume: 0, returnPct: 0, sharpe: 0, maxDrawdown: 0 };
    }

    const equity = parseFloat(accountInfo.account_equity);
    const firstEquity = parseFloat(portfolio[0]?.account_equity || "0");
    const lastEquity = parseFloat(portfolio[portfolio.length - 1]?.account_equity || "0");
    const pnl = portfolio.reduce((sum, p) => sum + parseFloat(p.pnl), 0);

    const volume = orderHistory
      .filter(o => o.order_status === "filled")
      .reduce((sum, o) => sum + parseFloat(o.filled_amount) * parseFloat(o.average_filled_price), 0);

    const returnPct = firstEquity > 0 ? ((lastEquity - firstEquity) / firstEquity) * 100 : 0;

    // Sharpe ratio
    const dailyReturns: number[] = [];
    for (let i = 1; i < portfolio.length; i++) {
      const prev = parseFloat(portfolio[i - 1].account_equity);
      const curr = parseFloat(portfolio[i].account_equity);
      if (prev > 0) dailyReturns.push((curr - prev) / prev);
    }
    const avgReturn = dailyReturns.length > 0 ? dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length : 0;
    const stdDev = dailyReturns.length > 1
      ? Math.sqrt(dailyReturns.reduce((s, r) => s + (r - avgReturn) ** 2, 0) / (dailyReturns.length - 1))
      : 1;
    const sharpe = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(365) : 0;

    // Max drawdown
    let peak = 0;
    let maxDd = 0;
    for (const p of portfolio) {
      const eq = parseFloat(p.account_equity);
      if (eq > peak) peak = eq;
      if (peak > 0) {
        const dd = (peak - eq) / peak;
        if (dd > maxDd) maxDd = dd;
      }
    }

    return { equity, pnl, volume, returnPct, sharpe, maxDrawdown: maxDd * 100 };
  }, [accountInfo, portfolio, orderHistory]);

  return (
    <div className="w-full max-w-7xl space-y-6 overflow-y-auto max-h-full py-4 px-2">
      <PnlStatsCards
        equity={stats.equity}
        pnl={stats.pnl}
        volume={stats.volume}
        returnPct={stats.returnPct}
        sharpe={stats.sharpe}
        maxDrawdown={stats.maxDrawdown}
        loading={loading && !accountInfo}
      />

      <PnlChart
        portfolio={portfolio}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        loading={loading && portfolio.length === 0}
      />

      <PnlTable
        positions={positions}
        prices={prices}
        orderHistory={orderHistory}
        loading={loading && positions.length === 0}
      />
    </div>
  );
}
