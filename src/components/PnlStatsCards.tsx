interface Props {
  equity: number;
  pnl: number;
  volume: number;
  returnPct: number;
  sharpe: number;
  maxDrawdown: number;
  loading?: boolean;
}

function StatCard({ label, value, color, loading }: { label: string; value: string; color?: string; loading?: boolean }) {
  return (
    <div className="stat-card min-w-0">
      <span className="text-[0.65rem] font-grotesk text-muted-foreground tracking-wider uppercase truncate block">
        {label}
      </span>
      {loading ? (
        <div className="h-6 w-20 bg-secondary/50 rounded animate-pulse" />
      ) : (
        <span
          className={`text-lg font-mono-system font-semibold leading-tight truncate block ${color || "text-foreground"}`}
          title={value}
        >
          {value}
        </span>
      )}
    </div>
  );
}

export function PnlStatsCards({ equity, pnl, volume, returnPct, sharpe, maxDrawdown, loading }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <StatCard
        label="Equity"
        value={`$${equity.toFixed(2)}`}
        loading={loading}
      />
      <StatCard
        label="PnL"
        value={`${pnl >= 0 ? "+" : "-"}$${Math.abs(pnl).toFixed(2)}`}
        color={pnl >= 0 ? "text-energy-green" : "text-risk-red"}
        loading={loading}
      />
      <StatCard
        label="Trading Volume"
        value={`$${volume.toFixed(2)}`}
        loading={loading}
      />
      <StatCard
        label="Return %"
        value={`${returnPct >= 0 ? "+" : ""}${returnPct.toFixed(2)}%`}
        color={returnPct >= 0 ? "text-energy-green" : "text-risk-red"}
        loading={loading}
      />
      <StatCard
        label="Sharpe Ratio"
        value={sharpe.toFixed(4)}
        color={sharpe >= 0 ? "text-energy-green" : "text-risk-red"}
        loading={loading}
      />
      <StatCard
        label="Max Drawdown"
        value={`${maxDrawdown.toFixed(2)}%`}
        color="text-risk-red"
        loading={loading}
      />
    </div>
  );
}
