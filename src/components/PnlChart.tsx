import { useState, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { PortfolioPoint } from "@/lib/pacifica-api";

interface Props {
  portfolio: PortfolioPoint[];
  timeRange: string;
  onTimeRangeChange: (range: string) => void;
  loading?: boolean;
}

const TIME_RANGES = [
  { label: "1D", value: "1d" },
  { label: "7D", value: "7d" },
  { label: "30D", value: "30d" },
  { label: "ALL", value: "all" },
];

export function PnlChart({ portfolio, timeRange, onTimeRangeChange, loading }: Props) {
  const [chartMode, setChartMode] = useState<"equity" | "pnl">("equity");

  const chartData = useMemo(() => {
    return portfolio.map(p => ({
      time: p.timestamp,
      equity: parseFloat(p.account_equity),
      pnl: parseFloat(p.pnl),
    }));
  }, [portfolio]);

  const activeKey = chartMode === "equity" ? "equity" : "pnl";
  const isPositive = chartData.length > 0 && chartData[chartData.length - 1][activeKey] >= (chartData[0]?.[activeKey] || 0);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    if (timeRange === "1d") return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <div className="surface-glass rounded-lg p-4 md:p-6">
      {/* Chart header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        {/* Chart mode toggle */}
        <div className="flex items-center gap-1 bg-secondary/40 rounded-lg p-0.5">
          <button
            onClick={() => setChartMode("equity")}
            className={`px-3 py-1.5 rounded-md text-xs font-grotesk font-medium transition-all ${
              chartMode === "equity" ? "tab-active border" : "tab-inactive border border-transparent"
            }`}
          >
            Account Equity
          </button>
          <button
            onClick={() => setChartMode("pnl")}
            className={`px-3 py-1.5 rounded-md text-xs font-grotesk font-medium transition-all ${
              chartMode === "pnl" ? "tab-active border" : "tab-inactive border border-transparent"
            }`}
          >
            PnL
          </button>
        </div>

        {/* Time range */}
        <div className="flex items-center gap-1 bg-secondary/40 rounded-lg p-0.5">
          {TIME_RANGES.map(r => (
            <button
              key={r.value}
              onClick={() => onTimeRangeChange(r.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-mono-system font-medium transition-all ${
                timeRange === r.value ? "tab-active border" : "tab-inactive border border-transparent"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-64 md:h-80">
        {loading ? (
          <div className="h-full w-full flex items-center justify-center">
            <div className="w-8 h-8 border border-primary/30 rounded animate-pulse" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground font-mono-system">
            No data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <defs>
                <linearGradient id="gradientGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(155, 100%, 50%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(155, 100%, 50%)" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradientRed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(0, 85%, 55%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(0, 85%, 55%)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time"
                tickFormatter={formatTime}
                tick={{ fontSize: 10, fill: "hsl(215, 15%, 50%)", fontFamily: "JetBrains Mono, monospace" }}
                axisLine={{ stroke: "hsl(220, 15%, 14%)" }}
                tickLine={false}
                minTickGap={40}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(215, 15%, 50%)", fontFamily: "JetBrains Mono, monospace" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `$${v.toFixed(2)}`}
                width={65}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(220, 18%, 7%)",
                  border: "1px solid hsl(220, 15%, 14%)",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontFamily: "JetBrains Mono, monospace",
                  color: "hsl(210, 20%, 92%)",
                }}
                labelFormatter={(ts: number) => new Date(ts).toLocaleString()}
                formatter={(value: number) => [`$${value.toFixed(4)}`, chartMode === "equity" ? "Equity" : "PnL"]}
              />
              <Area
                type="monotone"
                dataKey={activeKey}
                stroke={isPositive ? "hsl(155, 100%, 50%)" : "hsl(0, 85%, 55%)"}
                strokeWidth={1.5}
                fill={isPositive ? "url(#gradientGreen)" : "url(#gradientRed)"}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
