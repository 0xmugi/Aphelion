import { useState, useCallback } from "react";
import type { Position, PriceInfo } from "@/lib/pacifica-api";
import { closePosition, type ExecutionResult } from "@/lib/pacifica-execution";
import { MechanicalCounter } from "./MechanicalCounter";
import { MiniKline } from "./MiniKline";
import { LiquidationGauge } from "./LiquidationGauge";
import { toast } from "sonner";

interface Props {
  position: Position;
  price?: PriceInfo;
  isSelected: boolean;
  onSelect: () => void;
  account?: string | null;
  signMessage?: (message: string) => Promise<Uint8Array | null>;
}

export function PositionDetail({ position, price, isSelected, onSelect, account, signMessage }: Props) {
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!account || !signMessage) {
      toast.error("Connect wallet first");
      return;
    }
    setIsClosing(true);
    try {
      const result: ExecutionResult = await closePosition(
        account,
        position.symbol,
        position.side,
        position.amount,
        signMessage,
      );
      if (result.success) {
        toast.success(`Closing ${position.symbol} position submitted`);
      } else {
        toast.error(result.error || "Close failed");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsClosing(false);
    }
  }, [account, signMessage, position]);

  const notional = parseFloat(position.amount) * parseFloat(position.entry_price);
  const pnl = price
    ? (parseFloat(price.mark) - parseFloat(position.entry_price)) * parseFloat(position.amount) * (position.side === "bid" ? 1 : -1)
    : 0;
  const fundingCost = parseFloat(position.funding);
  const pnlPercent = (pnl / notional) * 100;
  const liqPrice = position.liquidation_price ? parseFloat(position.liquidation_price) : null;

  const isProfitable = pnl >= 0;
  const colorClass = isProfitable ? "text-energy-green" : "text-risk-red";

  return (
    <div
      className={`ripple-container elastic-hover cursor-pointer px-4 py-3 border-b border-border/30 transition-colors duration-500 ${
        isSelected ? "bg-secondary/50" : "hover:bg-secondary/20"
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-1.5 h-1.5 rounded-full ${isProfitable ? "bg-energy-green" : "bg-risk-red"}`} />
          <span className="font-mono-system text-sm font-semibold tracking-wide">{position.symbol}</span>
          <span className="text-[0.6rem] text-muted-foreground font-grotesk uppercase tracking-wider">
            {position.side === "bid" ? "long" : "short"}
          </span>
          {position.isolated && (
            <span className="text-[0.5rem] text-idle-amber font-mono-system tracking-widest border border-idle-amber/20 px-1.5 py-0.5 rounded-sm">
              ISO
            </span>
          )}
        </div>
        <div className={`${colorClass}`}>
          <MechanicalCounter value={pnl} decimals={2} prefix={pnl >= 0 ? "+" : ""} suffix="USD" className="text-sm" />
        </div>
      </div>

      {/* Liquidation gauge - always visible */}
      <div className="mt-2">
        <LiquidationGauge
          entryPrice={parseFloat(position.entry_price)}
          markPrice={price ? parseFloat(price.mark) : parseFloat(position.entry_price)}
          liquidationPrice={liqPrice}
          side={position.side}
        />
      </div>

      {/* Mini kline */}
      <div className="mt-2">
        <MiniKline symbol={position.symbol} />
      </div>

      {isSelected && (
        <div className="mt-3 grid grid-cols-3 gap-4 text-[0.65rem]">
          <div>
            <div className="text-muted-foreground font-grotesk mb-0.5">Entry</div>
            <div className="font-mono-system">${parseFloat(position.entry_price).toLocaleString()}</div>
          </div>
          <div>
            <div className="text-muted-foreground font-grotesk mb-0.5">Mark</div>
            <div className="font-mono-system">${price ? parseFloat(price.mark).toLocaleString() : "—"}</div>
          </div>
          <div>
            <div className="text-muted-foreground font-grotesk mb-0.5">Notional</div>
            <div className="font-mono-system">${notional.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          </div>
          <div>
            <div className="text-muted-foreground font-grotesk mb-0.5">PnL %</div>
            <div className={`font-mono-system ${colorClass}`}>{pnlPercent >= 0 ? "+" : ""}{pnlPercent.toFixed(2)}%</div>
          </div>
          <div>
            <div className="text-muted-foreground font-grotesk mb-0.5">Funding</div>
            <div className={`font-mono-system ${fundingCost >= 0 ? "text-energy-green" : "text-risk-red"}`}>
              {fundingCost >= 0 ? "+" : ""}{fundingCost.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground font-grotesk mb-0.5">Liq. Price</div>
            <div className="font-mono-system">{liqPrice ? `$${liqPrice.toLocaleString()}` : "—"}</div>
          </div>

          {/* Close position button */}
          <div className="col-span-3 mt-2">
            <button
              onClick={handleClose}
              disabled={isClosing || !account}
              className="w-full py-1.5 text-[0.55rem] font-mono-system font-semibold rounded-sm transition-all bg-risk-red/10 text-risk-red border border-risk-red/30 hover:bg-risk-red/20 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {isClosing ? "Closing..." : `Close ${position.symbol} Position`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
