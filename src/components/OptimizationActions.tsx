import { useState, useCallback } from "react";
import type { SmartAlert } from "@/hooks/use-trading-data";
import type { Position } from "@/lib/pacifica-api";
import { reduceLeverage, shiftMarginMode, closePosition, type ExecutionResult } from "@/lib/pacifica-execution";
import { toast } from "sonner";

interface Props {
  alert: SmartAlert;
  positions: Position[];
  account: string | null;
  signMessage: (message: string) => Promise<Uint8Array | null>;
}

type ActionState = "idle" | "confirming" | "signing" | "executing" | "done" | "error";

export function OptimizationActions({ alert, positions, account, signMessage }: Props) {
  const [state, setState] = useState<ActionState>("idle");
  const [error, setError] = useState<string | null>(null);

  const actions = getActionsForAlert(alert, positions);

  const executeAction = useCallback(async (action: OptAction) => {
    if (!account) {
      toast.error("Connect wallet first");
      return;
    }

    setState("confirming");

    // Brief confirmation delay to show state
    await new Promise(r => setTimeout(r, 300));
    setState("signing");

    let result: ExecutionResult;
    try {
      switch (action.type) {
        case "reduce-leverage":
          result = await reduceLeverage(account, action.symbol!, action.value as number, signMessage);
          break;
        case "shift-margin":
          result = await shiftMarginMode(account, action.symbol!, action.toIsolated!, undefined, signMessage);
          break;
        case "close-position": {
          const pos = positions.find(p => p.symbol === action.symbol);
          if (!pos) { result = { success: false, error: "Position not found" }; break; }
          setState("executing");
          result = await closePosition(account, pos.symbol, pos.side, pos.amount, signMessage);
          break;
        }
        default:
          result = { success: false, error: "Unknown action" };
      }
    } catch (e) {
      result = { success: false, error: (e as Error).message };
    }

    if (result.success) {
      setState("done");
      toast.success(`${action.label} executed`);
      setTimeout(() => setState("idle"), 2000);
    } else {
      setState("error");
      setError(result.error || "Execution failed");
      toast.error(result.error || "Execution failed");
      setTimeout(() => { setState("idle"); setError(null); }, 3000);
    }
  }, [account, signMessage, positions]);

  if (actions.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 mt-2">
      {actions.map((action, i) => (
        <button
          key={i}
          onClick={() => executeAction(action)}
          disabled={state !== "idle"}
          className={`
            group relative text-left text-[0.6rem] font-mono-system px-2.5 py-1.5 
            rounded-sm border transition-all duration-500 overflow-hidden
            ${state === "idle"
              ? "border-energy-green/20 text-energy-green/80 hover:border-energy-green/50 hover:bg-energy-green/5 elastic-hover"
              : state === "signing"
              ? "border-idle-amber/30 text-idle-amber/80 animate-pulse"
              : state === "executing"
              ? "border-energy-green/40 text-energy-green animate-pulse"
              : state === "done"
              ? "border-energy-green/60 text-energy-green"
              : state === "error"
              ? "border-risk-red/40 text-risk-red"
              : "border-border/30 text-muted-foreground"
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          {/* Ripple bg */}
          <div
            className={`absolute inset-0 transition-transform duration-700 origin-left ${
              state === "executing" ? "scale-x-100" : "scale-x-0"
            }`}
            style={{ background: "hsl(var(--energy-green) / 0.05)" }}
          />

          <span className="relative flex items-center gap-2">
            <span className="text-[0.7rem]">
              {state === "idle" && "⟡"}
              {state === "confirming" && "◌"}
              {state === "signing" && "◑"}
              {state === "executing" && "◉"}
              {state === "done" && "✓"}
              {state === "error" && "✗"}
            </span>
            <span>
              {state === "idle" && action.label}
              {state === "confirming" && "Preparing..."}
              {state === "signing" && "Sign in wallet..."}
              {state === "executing" && "Executing..."}
              {state === "done" && "Done"}
              {state === "error" && (error || "Failed")}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}

interface OptAction {
  type: "reduce-leverage" | "shift-margin" | "close-position";
  label: string;
  symbol?: string;
  value?: number;
  toIsolated?: boolean;
}

function getActionsForAlert(alert: SmartAlert, positions: Position[]): OptAction[] {
  const actions: OptAction[] = [];

  switch (alert.type) {
    case "over-margined":
      // Suggest reducing leverage on largest positions
      const sorted = [...positions].sort(
        (a, b) => parseFloat(b.amount) * parseFloat(b.entry_price) - parseFloat(a.amount) * parseFloat(a.entry_price)
      );
      if (sorted[0]) {
        actions.push({
          type: "reduce-leverage",
          label: `Reduce ${sorted[0].symbol} leverage to 3×`,
          symbol: sorted[0].symbol,
          value: 3,
        });
      }
      break;

    case "funding-bleed":
      if (alert.symbol) {
        const pos = positions.find(p => p.symbol === alert.symbol);
        if (pos) {
          actions.push({
            type: "close-position",
            label: `Close ${alert.symbol} position`,
            symbol: alert.symbol,
          });
        }
      }
      break;

    case "idle-capital":
      // Suggest switching cross positions to isolated to free margin
      const crossPositions = positions.filter(p => !p.isolated);
      if (crossPositions[0]) {
        actions.push({
          type: "shift-margin",
          label: `Isolate ${crossPositions[0].symbol} margin`,
          symbol: crossPositions[0].symbol,
          toIsolated: true,
        });
      }
      break;

    case "leverage-inefficient":
      if (alert.symbol) {
        actions.push({
          type: "reduce-leverage",
          label: `Reduce ${alert.symbol} to 2×`,
          symbol: alert.symbol,
          value: 2,
        });
        actions.push({
          type: "close-position",
          label: `Close ${alert.symbol}`,
          symbol: alert.symbol,
        });
      }
      break;
  }

  return actions;
}
