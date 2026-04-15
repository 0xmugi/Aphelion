import { MechanicalCounter } from "./MechanicalCounter";
import type { AccountInfo } from "@/lib/pacifica-api";

interface Props {
  account: AccountInfo;
}

export function MarginField({ account }: Props) {
  const equity = parseFloat(account.account_equity);
  const marginUsed = parseFloat(account.total_margin_used);
  const available = parseFloat(account.available_to_spend);
  const utilization = marginUsed / equity;

  const getUtilColor = (u: number) => {
    if (u > 0.8) return "text-risk-red";
    if (u > 0.6) return "text-idle-amber";
    return "text-energy-green";
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Equity */}
      <div>
        <div className="text-[0.55rem] font-grotesk text-muted-foreground tracking-[0.2em] uppercase mb-1">
          Account Equity
        </div>
        <MechanicalCounter value={equity} prefix="$" decimals={2} className="text-2xl font-semibold" />
      </div>

      {/* Margin utilization bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[0.55rem] font-grotesk text-muted-foreground tracking-[0.15em] uppercase">
            Margin Utilization
          </span>
          <span className={`text-[0.65rem] font-mono-system ${getUtilColor(utilization)}`}>
            {(utilization * 100).toFixed(1)}%
          </span>
        </div>
        <div className="h-1 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000 ease-out"
            style={{
              width: `${utilization * 100}%`,
              background: utilization > 0.8
                ? "hsl(var(--risk-red))"
                : utilization > 0.6
                ? "hsl(var(--idle-amber))"
                : "hsl(var(--energy-green))",
            }}
          />
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 text-[0.65rem]">
        <div>
          <div className="text-muted-foreground font-grotesk mb-0.5">Margin Used</div>
          <MechanicalCounter value={marginUsed} prefix="$" decimals={0} className="font-mono-system" />
        </div>
        <div>
          <div className="text-muted-foreground font-grotesk mb-0.5">Available</div>
          <MechanicalCounter value={available} prefix="$" decimals={0} className="text-energy-green font-mono-system" />
        </div>
        <div>
          <div className="text-muted-foreground font-grotesk mb-0.5">Cross MMR</div>
          <div className="font-mono-system">${parseFloat(account.cross_mmr).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
        </div>
        <div>
          <div className="text-muted-foreground font-grotesk mb-0.5">Withdrawable</div>
          <div className="font-mono-system">${parseFloat(account.available_to_withdraw).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
        </div>
      </div>

      {/* Balance + positions */}
      <div className="flex items-center gap-4 text-[0.55rem] text-muted-foreground font-grotesk pt-1 border-t border-border/30">
        <span>{account.positions_count} positions</span>
        <span>{account.orders_count} orders</span>
        <span>fee tier {account.fee_level}</span>
      </div>
    </div>
  );
}
