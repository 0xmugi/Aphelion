import { useState, useCallback } from "react";
import { cancelOrder, type ExecutionResult } from "@/lib/pacifica-execution";
import { toast } from "sonner";

export interface OpenOrder {
  i: number;        // order id
  I?: string;       // client order id
  s: string;        // symbol
  d: "bid" | "ask"; // side
  a: string;        // amount
  p: string;        // price
  f: string;        // filled amount
  ro: boolean;      // reduce only
  po: boolean;      // post only
  st: string;       // status
  t: number;        // timestamp
}

interface Props {
  orders: OpenOrder[];
  account: string | null;
  signMessage: (message: string) => Promise<Uint8Array | null>;
}

export function OpenOrders({ orders, account, signMessage }: Props) {
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const handleCancel = useCallback(async (order: OpenOrder) => {
    if (!account) return;
    setCancellingId(order.i);

    try {
      const result: ExecutionResult = await cancelOrder(
        account,
        order.s,
        order.i,
        signMessage,
      );

      if (result.success) {
        toast.success(`Order #${order.i} cancelled`);
      } else {
        toast.error(result.error || "Cancel failed");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCancellingId(null);
    }
  }, [account, signMessage]);

  if (orders.length === 0) {
    return (
      <div className="px-4 py-2">
        <div className="text-[0.55rem] font-grotesk text-muted-foreground tracking-[0.2em] uppercase mb-2">
          Open Orders
        </div>
        <div className="text-[0.5rem] font-mono-system text-muted-foreground/50 text-center py-3">
          No open orders
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-2">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[0.55rem] font-grotesk text-muted-foreground tracking-[0.2em] uppercase">
          Open Orders
        </div>
        <div className="text-[0.45rem] font-mono-system text-muted-foreground/60">
          {orders.length}
        </div>
      </div>

      <div className="space-y-1.5">
        {orders.map(order => {
          const isBid = order.d === "bid";
          const filled = parseFloat(order.f || "0");
          const total = parseFloat(order.a);
          const fillPct = total > 0 ? (filled / total) * 100 : 0;
          const isCancelling = cancellingId === order.i;

          return (
            <div
              key={order.i}
              className="surface-glass rounded-sm p-2 group relative overflow-hidden"
            >
              {/* Fill progress bar */}
              {fillPct > 0 && (
                <div
                  className={`absolute left-0 top-0 bottom-0 ${isBid ? "bg-energy-green/5" : "bg-risk-red/5"}`}
                  style={{ width: `${fillPct}%` }}
                />
              )}

              <div className="relative flex items-center justify-between gap-2">
                {/* Left: symbol + side */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`text-[0.5rem] font-mono-system font-semibold ${isBid ? "text-energy-green" : "text-risk-red"}`}>
                    {isBid ? "BUY" : "SELL"}
                  </span>
                  <span className="text-[0.55rem] font-mono-system text-foreground font-medium">
                    {order.s}
                  </span>
                  {order.po && (
                    <span className="text-[0.4rem] font-mono-system text-idle-amber/60 border border-idle-amber/20 px-1 rounded-sm">
                      POST
                    </span>
                  )}
                </div>

                {/* Right: cancel button */}
                <button
                  onClick={() => handleCancel(order)}
                  disabled={isCancelling || !account}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-[0.45rem] font-mono-system text-risk-red/70 hover:text-risk-red px-1.5 py-0.5 border border-risk-red/20 hover:border-risk-red/40 rounded-sm disabled:opacity-30"
                >
                  {isCancelling ? "..." : "✕"}
                </button>
              </div>

              {/* Details row */}
              <div className="relative flex items-center gap-3 mt-1">
                <div className="text-[0.45rem] font-mono-system text-muted-foreground">
                  <span className="text-muted-foreground/50">px </span>
                  <span className="text-foreground/80">{parseFloat(order.p).toLocaleString()}</span>
                </div>
                <div className="text-[0.45rem] font-mono-system text-muted-foreground">
                  <span className="text-muted-foreground/50">amt </span>
                  <span className="text-foreground/80">{order.a}</span>
                </div>
                {fillPct > 0 && (
                  <div className="text-[0.45rem] font-mono-system text-idle-amber/70">
                    {fillPct.toFixed(1)}% filled
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
