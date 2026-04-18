import { useState, useCallback } from "react";
import { createMarketOrder, createLimitOrder, roundToLotSize, type MarketOrderParams, type LimitOrderParams, type ExecutionResult } from "@/lib/pacifica-execution";
import { SymbolSelector } from "@/components/SymbolSelector";
import { toast } from "sonner";


type AmountUnit = "token" | "usd";

interface SymbolPrice {
  symbol: string;
  mark: string;
}

interface Props {
  account: string | null;
  signMessage: (message: string) => Promise<Uint8Array | null>;
  selectedSymbol: string | null;
  defaultSymbol?: string;
  markPrice?: number;
  availableSymbols?: string[];
  symbolPrices?: SymbolPrice[];
  onSymbolChange?: (symbol: string) => void;
}

type OrderState = "idle" | "confirming" | "signing" | "submitting" | "done" | "error";
type OrderType = "market" | "limit";

export function TradePanel({ account, signMessage, selectedSymbol, defaultSymbol = "BTC", markPrice, availableSymbols = [], symbolPrices = [], onSymbolChange }: Props) {
  const symbol = selectedSymbol || defaultSymbol;
  const [side, setSide] = useState<"bid" | "ask">("bid");
  const [orderType, setOrderType] = useState<OrderType>("market");
  const [amount, setAmount] = useState("");
  const [amountUnit, setAmountUnit] = useState<AmountUnit>("usd");
  const [leverage, setLeverage] = useState(10);
  const [price, setPrice] = useState("");
  const [slippage, setSlippage] = useState("0.5");
  const [reduceOnly, setReduceOnly] = useState(false);
  const [postOnly, setPostOnly] = useState(false);
  const [showTpSl, setShowTpSl] = useState(false);
  const [tpPrice, setTpPrice] = useState("");
  const [slPrice, setSlPrice] = useState("");
  const [state, setState] = useState<OrderState>("idle");
  const [lastResult, setLastResult] = useState<ExecutionResult | null>(null);

  // Convert USD amount to token amount and round to lot size
  // Compute USD notional value of the current input
  const usdNotional = (() => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return 0;
    if (amountUnit === "usd") return val;
    return val * (markPrice || 0);
  })();

  const isAmountTooLow = usdNotional > 0 && usdNotional < 10;
  const canSubmit = state === "idle" && !!account && usdNotional >= 10;

  // Convert USD amount to token amount and round to lot size
  const getTokenAmount = useCallback(() => {
    let raw: string;
    if (amountUnit === "token") {
      raw = amount;
    } else {
      const px = markPrice || 0;
      if (px <= 0) return amount;
      raw = (parseFloat(amount) / px).toFixed(10);
    }
    return roundToLotSize(raw, symbol);
  }, [amount, amountUnit, markPrice, symbol]);

  const handleSubmit = useCallback(async () => {
    if (!account) {
      toast.error("Connect wallet first");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (orderType === "limit" && (!price || parseFloat(price) <= 0)) {
      toast.error("Enter a valid price");
      return;
    }
    if (tpPrice && parseFloat(tpPrice) <= 0) {
      toast.error("Enter a valid take profit price");
      return;
    }
    if (slPrice && parseFloat(slPrice) <= 0) {
      toast.error("Enter a valid stop loss price");
      return;
    }

    setState("confirming");
    await new Promise(r => setTimeout(r, 200));
    setState("signing");

    const tp = tpPrice ? { stopPrice: tpPrice } : undefined;
    const sl = slPrice ? { stopPrice: slPrice } : undefined;

    try {
      let result: ExecutionResult;

      const tokenAmount = getTokenAmount();

      if (orderType === "market") {
        const params: MarketOrderParams = {
          account,
          symbol,
          side,
          amount: tokenAmount,
          reduceOnly,
          slippagePercent: slippage,
          takeProfit: tp,
          stopLoss: sl,
        };
        result = await createMarketOrder(params, signMessage);
      } else {
        const params: LimitOrderParams = {
          account,
          symbol,
          side,
          amount: tokenAmount,
          price,
          reduceOnly,
          postOnly,
          takeProfit: tp,
          stopLoss: sl,
        };
        result = await createLimitOrder(params, signMessage);
      }

      setLastResult(result);

      if (result.success) {
        setState("done");
        const label = orderType === "market" ? "Market" : "Limit";
        toast.success(`${label} ${side === "bid" ? "Buy" : "Sell"} ${amount} ${symbol} submitted`, {
          description: `Order ID: ${(result.data as Record<string, unknown>)?.i || "pending"}`,
        });
        setAmount("");
        if (orderType === "limit") setPrice("");
        setTpPrice("");
        setSlPrice("");
        setTimeout(() => setState("idle"), 2000);
      } else {
        setState("error");
        toast.error(result.error || "Order failed");
        setTimeout(() => setState("idle"), 3000);
      }
    } catch (e) {
      setState("error");
      toast.error((e as Error).message);
      setTimeout(() => setState("idle"), 3000);
    }
  }, [account, symbol, side, orderType, amount, price, reduceOnly, postOnly, slippage, tpPrice, slPrice, signMessage, getTokenAmount]);

  const stateLabel: Record<OrderState, string> = {
    idle: `${side === "bid" ? "Buy" : "Sell"} ${symbol}`,
    confirming: "Preparing...",
    signing: "Sign in wallet...",
    submitting: "Submitting...",
    done: "✓ Submitted",
    error: lastResult?.error || "Failed",
  };

  return (
    <div className="surface-glass rounded-sm p-3">
      {/* Header with symbol selector */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-[0.55rem] font-grotesk text-muted-foreground tracking-[0.2em] uppercase">
          Trade
        </div>
        {symbolPrices.length > 0 ? (
          <SymbolSelector
            value={symbol}
            symbols={symbolPrices}
            onChange={sym => onSymbolChange?.(sym)}
          />
        ) : availableSymbols.length > 1 ? (
          <SymbolSelector
            value={symbol}
            symbols={availableSymbols.map(s => ({ symbol: s, mark: "0" }))}
            onChange={sym => onSymbolChange?.(sym)}
          />
        ) : (
          <div className="font-mono-system text-[0.65rem] font-semibold">{symbol}</div>
        )}
      </div>

      {/* Order type toggle */}
      <div className="flex gap-1 mb-3">
        <button
          onClick={() => setOrderType("market")}
          className={`flex-1 py-1 text-[0.55rem] font-mono-system rounded-sm transition-colors ${
            orderType === "market"
              ? "bg-secondary text-foreground border border-border/50"
              : "text-muted-foreground border border-border/20 hover:border-border/40"
          }`}
        >
          MARKET
        </button>
        <button
          onClick={() => setOrderType("limit")}
          className={`flex-1 py-1 text-[0.55rem] font-mono-system rounded-sm transition-colors ${
            orderType === "limit"
              ? "bg-secondary text-foreground border border-border/50"
              : "text-muted-foreground border border-border/20 hover:border-border/40"
          }`}
        >
          LIMIT
        </button>
      </div>

      {/* Side toggle */}
      <div className="flex gap-1 mb-3">
        <button
          onClick={() => setSide("bid")}
          className={`flex-1 py-1.5 text-[0.6rem] font-mono-system rounded-sm transition-all duration-300 ${
            side === "bid"
              ? "bg-energy-green/15 text-energy-green border border-energy-green/30"
              : "text-muted-foreground border border-border/30 hover:border-border/50"
          }`}
        >
          BUY / LONG
        </button>
        <button
          onClick={() => setSide("ask")}
          className={`flex-1 py-1.5 text-[0.6rem] font-mono-system rounded-sm transition-all duration-300 ${
            side === "ask"
              ? "bg-risk-red/15 text-risk-red border border-risk-red/30"
              : "text-muted-foreground border border-border/30 hover:border-border/50"
          }`}
        >
          SELL / SHORT
        </button>
      </div>

      {/* Leverage selector */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <label className="text-[0.5rem] font-grotesk text-muted-foreground tracking-wider uppercase">
            Leverage
          </label>
          <span className="text-[0.6rem] font-mono-system text-foreground font-semibold">{leverage}×</span>
        </div>
        <div className="flex gap-1">
          {[1, 2, 5, 10, 20, 50].map(lev => (
            <button
              key={lev}
              onClick={() => setLeverage(lev)}
              className={`flex-1 py-1 text-[0.5rem] font-mono-system rounded-sm transition-colors ${
                leverage === lev
                  ? "bg-idle-amber/15 text-idle-amber border border-idle-amber/30"
                  : "text-muted-foreground border border-border/20 hover:border-border/40"
              }`}
            >
              {lev}×
            </button>
          ))}
        </div>
      </div>

      {/* Price input (limit only) */}
      {orderType === "limit" && (
        <div className="mb-2">
          <label className="text-[0.5rem] font-grotesk text-muted-foreground tracking-wider uppercase mb-1 block">
            Price
          </label>
          <input
            type="text"
            value={price}
            onChange={e => setPrice(e.target.value)}
            placeholder="0.00"
            className="w-full bg-background border border-border/40 rounded-sm px-2.5 py-1.5 text-[0.7rem] font-mono-system text-foreground placeholder:text-muted-foreground/40 focus:border-idle-amber/40 focus:outline-none transition-colors"
          />
        </div>
      )}

      {/* Amount input with unit toggle */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <label className="text-[0.5rem] font-grotesk text-muted-foreground tracking-wider uppercase">
            Amount
          </label>
          <div className="flex gap-0.5">
            <button
              onClick={() => setAmountUnit("token")}
              className={`px-1.5 py-0.5 text-[0.45rem] font-mono-system rounded-sm transition-colors ${
                amountUnit === "token"
                  ? "bg-secondary text-foreground border border-border/50"
                  : "text-muted-foreground/60 border border-transparent hover:text-muted-foreground"
              }`}
            >
              {symbol}
            </button>
            <button
              onClick={() => setAmountUnit("usd")}
              className={`px-1.5 py-0.5 text-[0.45rem] font-mono-system rounded-sm transition-colors ${
                amountUnit === "usd"
                  ? "bg-secondary text-foreground border border-border/50"
                  : "text-muted-foreground/60 border border-transparent hover:text-muted-foreground"
              }`}
            >
              USD
            </button>
          </div>
        </div>
        <div className="relative">
          <input
            type="text"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder={amountUnit === "token" ? "0.001" : "100.00"}
            className="w-full bg-background border border-border/40 rounded-sm px-2.5 py-1.5 text-[0.7rem] font-mono-system text-foreground placeholder:text-muted-foreground/40 focus:border-energy-green/40 focus:outline-none transition-colors"
          />
          {/* Show converted value */}
          {amount && parseFloat(amount) > 0 && markPrice && markPrice > 0 && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[0.45rem] font-mono-system text-muted-foreground/50">
              {amountUnit === "token"
                ? `≈ $${(parseFloat(amount) * markPrice).toFixed(2)}`
                : `≈ ${(parseFloat(amount) / markPrice).toFixed(6)} ${symbol}`
              }
            </div>
          )}
        </div>
        {/* Position size + margin breakdown */}
        {usdNotional > 0 && (
          <div className="mt-1.5 grid grid-cols-2 gap-2 px-2 py-1.5 bg-secondary/40 rounded-sm border border-border/20">
            <div>
              <div className="text-[0.4rem] font-grotesk text-muted-foreground/60 tracking-wider uppercase">Position Size</div>
              <div className="text-[0.65rem] font-mono-system text-foreground font-semibold">${usdNotional.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-[0.4rem] font-grotesk text-muted-foreground/60 tracking-wider uppercase">Margin ({leverage}×)</div>
              <div className="text-[0.65rem] font-mono-system text-idle-amber font-semibold">${(usdNotional / leverage).toFixed(2)}</div>
            </div>
          </div>
        )}
        <div className="text-[0.42rem] font-mono-system text-muted-foreground/50 mt-1 leading-tight">
          Amount = position size (notional). Margin used = position ÷ leverage. Minimum position $10.
        </div>
      </div>

      {/* Slippage (market only) */}
      {orderType === "market" && (
        <div className="mb-2">
          <label className="text-[0.5rem] font-grotesk text-muted-foreground tracking-wider uppercase mb-1 block">
            Max Slippage
          </label>
          <div className="flex gap-1">
            {["0.1", "0.5", "1.0", "2.0"].map(s => (
              <button
                key={s}
                onClick={() => setSlippage(s)}
                className={`flex-1 py-1 text-[0.55rem] font-mono-system rounded-sm transition-colors ${
                  slippage === s
                    ? "bg-secondary text-foreground border border-border/50"
                    : "text-muted-foreground border border-border/20 hover:border-border/40"
                }`}
              >
                {s}%
              </button>
            ))}
          </div>
        </div>
      )}

      {/* TP/SL toggle */}
      <button
        onClick={() => setShowTpSl(!showTpSl)}
        className="w-full flex items-center justify-between mb-2 py-1 text-[0.5rem] font-grotesk text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="tracking-wider uppercase">
          TP / SL {(tpPrice || slPrice) && <span className="text-energy-green">●</span>}
        </span>
        <svg
          width="8" height="8" viewBox="0 0 8 8" fill="none"
          className={`transition-transform duration-200 ${showTpSl ? "rotate-180" : ""}`}
        >
          <path d="M1 3L4 6L7 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </button>

      {/* TP/SL inputs */}
      {showTpSl && (
        <div className="mb-2 space-y-2 pl-1 border-l border-energy-green/20">
          <div>
            <label className="text-[0.45rem] font-grotesk text-energy-green/70 tracking-wider uppercase mb-0.5 block">
              Take Profit Price
            </label>
            <input
              type="text"
              value={tpPrice}
              onChange={e => setTpPrice(e.target.value)}
              placeholder="—"
              className="w-full bg-background border border-border/30 rounded-sm px-2 py-1 text-[0.65rem] font-mono-system text-foreground placeholder:text-muted-foreground/30 focus:border-energy-green/30 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="text-[0.45rem] font-grotesk text-risk-red/70 tracking-wider uppercase mb-0.5 block">
              Stop Loss Price
            </label>
            <input
              type="text"
              value={slPrice}
              onChange={e => setSlPrice(e.target.value)}
              placeholder="—"
              className="w-full bg-background border border-border/30 rounded-sm px-2 py-1 text-[0.65rem] font-mono-system text-foreground placeholder:text-muted-foreground/30 focus:border-risk-red/30 focus:outline-none transition-colors"
            />
          </div>
        </div>
      )}

      {/* Options row */}
      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setReduceOnly(!reduceOnly)}
            className={`w-3.5 h-3.5 rounded-sm border transition-colors ${
              reduceOnly ? "bg-energy-green/20 border-energy-green/50" : "border-border/40"
            }`}
          >
            {reduceOnly && <span className="text-[0.5rem] text-energy-green block text-center leading-none">✓</span>}
          </button>
          <span className="text-[0.5rem] font-grotesk text-muted-foreground">Reduce only</span>
        </div>

        {orderType === "limit" && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPostOnly(!postOnly)}
              className={`w-3.5 h-3.5 rounded-sm border transition-colors ${
                postOnly ? "bg-idle-amber/20 border-idle-amber/50" : "border-border/40"
              }`}
            >
              {postOnly && <span className="text-[0.5rem] text-idle-amber block text-center leading-none">✓</span>}
            </button>
            <span className="text-[0.5rem] font-grotesk text-muted-foreground">Post only</span>
          </div>
        )}
      </div>

      {/* Minimum order note */}
      {isAmountTooLow && (
        <div className="mb-2 text-[0.5rem] font-mono-system text-risk-red/80 text-center">
          Minimum order size is $10
        </div>
      )}

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className={`
          w-full py-2 rounded-sm text-[0.65rem] font-mono-system font-semibold
          transition-all duration-500 relative overflow-hidden
          ${state === "idle" && side === "bid" && canSubmit
            ? "bg-energy-green/10 text-energy-green border border-energy-green/30 hover:bg-energy-green/20 elastic-hover"
            : state === "idle" && side === "ask" && canSubmit
            ? "bg-risk-red/10 text-risk-red border border-risk-red/30 hover:bg-risk-red/20 elastic-hover"
            : state === "signing"
            ? "bg-idle-amber/10 text-idle-amber border border-idle-amber/30 animate-pulse"
            : state === "done"
            ? "bg-energy-green/20 text-energy-green border border-energy-green/50"
            : state === "error"
            ? "bg-risk-red/10 text-risk-red border border-risk-red/30"
            : "bg-secondary text-muted-foreground border border-border/30"
          }
          disabled:opacity-40 disabled:cursor-not-allowed
        `}
      >
        {(state === "signing" || state === "submitting") && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-idle-amber/10 to-transparent animate-energy-flow" />
        )}
        <span className="relative">
          {state === "idle" ? `${orderType === "limit" ? "Limit " : ""}${stateLabel[state]}` : stateLabel[state]}
        </span>
      </button>

      {!account && (
        <div className="mt-2 text-[0.45rem] font-grotesk text-muted-foreground/60 text-center">
          Connect wallet to trade
        </div>
      )}
    </div>
  );
}