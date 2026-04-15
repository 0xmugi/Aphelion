import type { SmartAlert } from "@/hooks/use-trading-data";
import type { Position } from "@/lib/pacifica-api";
import { OptimizationActions } from "./OptimizationActions";
import { useState } from "react";

interface Props {
  alerts: SmartAlert[];
  onDismiss: (id: string) => void;
  positions?: Position[];
  account?: string | null;
  signMessage?: (message: string) => Promise<Uint8Array | null>;
}

const alertStyles = {
  "over-margined": { border: "border-risk-red/30", bg: "bg-risk-red-dim/20", icon: "⊘", color: "text-risk-red" },
  "funding-bleed": { border: "border-funding-blue/30", bg: "bg-funding-blue-dim/20", icon: "◉", color: "text-funding-blue" },
  "idle-capital": { border: "border-idle-amber/30", bg: "bg-idle-amber-dim/20", icon: "◎", color: "text-idle-amber" },
  "leverage-inefficient": { border: "border-muted-foreground/20", bg: "bg-muted/30", icon: "◇", color: "text-muted-foreground" },
};

export function AlertStream({ alerts, onDismiss, positions = [], account, signMessage }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (alerts.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 max-w-xs">
      {alerts.map((alert, i) => {
        const style = alertStyles[alert.type];
        const isExpanded = expandedId === alert.id;
        return (
          <div
            key={alert.id}
            className={`${style.bg} ${style.border} border rounded-sm px-3 py-2 elastic-hover ripple-container`}
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => setExpandedId(isExpanded ? null : alert.id)}
            >
              <span className={`${style.color} text-sm`}>{style.icon}</span>
              <span className={`${style.color} text-xs font-grotesk font-semibold tracking-wide flex-1`}>
                {alert.message}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); onDismiss(alert.id); }}
                className="text-[0.5rem] text-muted-foreground/40 hover:text-muted-foreground transition-colors"
              >
                ✕
              </button>
            </div>
            <p className="text-[0.65rem] text-muted-foreground mt-1 leading-relaxed font-grotesk">
              {alert.detail}
            </p>

            {/* Optimization actions - expand on click */}
            <div
              className={`overflow-hidden transition-all duration-500 ${
                isExpanded ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              {positions.length > 0 && signMessage && (
                <OptimizationActions
                  alert={alert}
                  positions={positions}
                  account={account || null}
                  signMessage={signMessage}
                />
              )}
            </div>

            {!isExpanded && positions.length > 0 && (
              <div className="text-[0.5rem] text-energy-green/40 mt-1 font-mono-system cursor-pointer hover:text-energy-green/70 transition-colors"
                   onClick={() => setExpandedId(alert.id)}>
                ⟡ tap to optimize
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
