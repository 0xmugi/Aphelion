import { useMemo } from "react";

interface Props {
  entryPrice: number;
  markPrice: number;
  liquidationPrice: number | null;
  side: "bid" | "ask";
  className?: string;
}

export function LiquidationGauge({ entryPrice, markPrice, liquidationPrice, side, className = "" }: Props) {
  const { distancePercent, riskLevel, riskColor, gaugeWidth } = useMemo(() => {
    if (!liquidationPrice || liquidationPrice <= 0) {
      return { distancePercent: 100, riskLevel: "SAFE" as const, riskColor: "energy-green", gaugeWidth: 5 };
    }

    // Distance from current mark price to liquidation
    const dist = side === "bid"
      ? ((markPrice - liquidationPrice) / markPrice) * 100
      : ((liquidationPrice - markPrice) / markPrice) * 100;

    const clamped = Math.max(0, Math.min(100, dist));

    let level: "SAFE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    let color: string;
    if (clamped > 30) { level = "SAFE"; color = "energy-green"; }
    else if (clamped > 20) { level = "LOW"; color = "energy-green"; }
    else if (clamped > 10) { level = "MEDIUM"; color = "idle-amber"; }
    else if (clamped > 5) { level = "HIGH"; color = "risk-red"; }
    else { level = "CRITICAL"; color = "risk-red"; }

    // Gauge fills inversely — more filled = more risk
    const width = Math.max(5, 100 - clamped);

    return { distancePercent: clamped, riskLevel: level, riskColor: color, gaugeWidth: width };
  }, [entryPrice, markPrice, liquidationPrice, side]);

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[0.5rem] font-grotesk text-muted-foreground tracking-wider uppercase">
          Liq. Distance
        </span>
        <span className={`text-[0.55rem] font-mono-system text-${riskColor} font-semibold`}>
          {distancePercent.toFixed(1)}%
        </span>
      </div>

      {/* Gauge track */}
      <div className="relative h-1.5 w-full bg-secondary/50 rounded-full overflow-hidden">
        {/* Risk fill — fills from right to left */}
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out ${
            riskLevel === "CRITICAL"
              ? "bg-risk-red animate-pulse"
              : riskLevel === "HIGH"
              ? "bg-risk-red"
              : riskLevel === "MEDIUM"
              ? "bg-idle-amber"
              : "bg-energy-green/60"
          }`}
          style={{ width: `${gaugeWidth}%` }}
        />
        {/* Mark price indicator */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 bg-foreground/80 rounded-full"
          style={{ left: `${Math.min(95, Math.max(5, 100 - distancePercent))}%` }}
        />
      </div>

      {/* Labels */}
      <div className="flex items-center justify-between mt-1">
        <span className="text-[0.45rem] font-mono-system text-muted-foreground/50">
          {liquidationPrice ? `$${liquidationPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "N/A"}
        </span>
        <span className={`text-[0.45rem] font-mono-system text-${riskColor}/70 tracking-widest`}>
          {riskLevel}
        </span>
      </div>
    </div>
  );
}