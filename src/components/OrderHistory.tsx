import { useMemo } from "react";

export interface HistoricalOrder {
  i: number;
  s: string;
  d: "bid" | "ask";
  a: string;
  p: string;         // order price
  ep?: string;        // execution/avg fill price
  f: string;          // filled amount
  st: "filled" | "cancelled";
  t: number;          // created
  ft?: number;        // fill/cancel timestamp
}

interface Props {
  orders: HistoricalOrder[];
}

function formatTime(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = diffMs / 3600000;

  if (diffH < 1) return `${Math.floor(diffMs / 60000)}m ago`;
  if (diffH < 24) return `${Math.floor(diffH)}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function OrderHistory({ orders }: Props) {
  const sorted = useMemo(() =>
    [...orders].sort((a, b) => (b.ft || b.t) - (a.ft || a.t)),
    [orders]
  );

  if (sorted.length === 0) {
    return (
      <div className="px-4 py-2">
        <div className="text-[0.55rem] font-grotesk text-muted-foreground tracking-[0.2em] uppercase mb-2">
          Order History
        </div>
        <div className="text-[0.5rem] font-mono-system text-muted-foreground/50 text-center py-3">
          No order history
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-2">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[0.55rem] font-grotesk text-muted-foreground tracking-[0.2em] uppercase">
          Order History
        </div>
        <div className="text-[0.45rem] font-mono-system text-muted-foreground/60">
          {sorted.length}
        </div>
      </div>

      <div className="space-y-1">
        {sorted.slice(0, 20).map(order => {
          const isBid = order.d === "bid";
          const isFilled = order.st === "filled";

          return (
            <div
              key={`${order.i}-${order.st}`}
              className="surface-glass rounded-sm p-1.5 flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                {/* Status dot */}
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  isFilled ? "bg-energy-green" : "bg-muted-foreground/40"
                }`} />

                {/* Side */}
                <span className={`text-[0.45rem] font-mono-system font-semibold ${
                  isBid ? "text-energy-green/80" : "text-risk-red/80"
                }`}>
                  {isBid ? "B" : "S"}
                </span>

                {/* Symbol */}
                <span className="text-[0.5rem] font-mono-system text-foreground/80 font-medium">
                  {order.s}
                </span>

                {/* Amount */}
                <span className="text-[0.45rem] font-mono-system text-muted-foreground">
                  {order.a}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Price */}
                <div className="text-right">
                  {isFilled && order.ep ? (
                    <div className="text-[0.45rem] font-mono-system text-foreground/70">
                      {parseFloat(order.ep).toLocaleString()}
                    </div>
                  ) : (
                    <div className="text-[0.45rem] font-mono-system text-muted-foreground/50 line-through">
                      {parseFloat(order.p).toLocaleString()}
                    </div>
                  )}
                </div>

                {/* Status label */}
                <span className={`text-[0.4rem] font-mono-system px-1 py-0.5 rounded-sm border ${
                  isFilled
                    ? "text-energy-green/70 border-energy-green/20 bg-energy-green/5"
                    : "text-muted-foreground/50 border-border/20"
                }`}>
                  {isFilled ? "FILL" : "CXLD"}
                </span>

                {/* Time */}
                <span className="text-[0.4rem] font-mono-system text-muted-foreground/50 w-10 text-right">
                  {formatTime(order.ft || order.t)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
