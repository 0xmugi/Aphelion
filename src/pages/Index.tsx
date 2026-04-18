import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useWalletState } from "@/hooks/use-wallet-state";
import { useTradingData } from "@/hooks/use-trading-data";
import { OrbitalField } from "@/components/OrbitalField";
import { EfficiencyCore } from "@/components/EfficiencyCore";
import { AlertStream } from "@/components/AlertStream";
import { EquityCurve } from "@/components/EquityCurve";
import { PositionDetail } from "@/components/PositionDetail";
import { MarginField } from "@/components/MarginField";
import { MechanicalCounter } from "@/components/MechanicalCounter";
import { FundingHeatmap } from "@/components/FundingHeatmap";
import { OrderbookDepth } from "@/components/OrderbookDepth";
import { PnlBreakdown } from "@/components/PnlBreakdown";
import { TradePanel } from "@/components/TradePanel";
import { FloatingTradePanel } from "@/components/FloatingTradePanel";
import { OpenOrders } from "@/components/OpenOrders";
import { OrderHistory } from "@/components/OrderHistory";
import { useIsMobile } from "@/hooks/use-mobile";

const Index = () => {
  const navigate = useNavigate();
  const wallet = useWalletState();
  const isMobile = useIsMobile();
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const data = useTradingData(wallet.address, selectedSymbol);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"orbit" | "timeline" | "funding" | "depth" | "pnl">("orbit");
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

  const handleDismissAlert = useCallback((id: string) => {
    setDismissedAlerts(prev => new Set([...prev, id]));
  }, []);

  const handleMarginShift = useCallback((fromSymbol: string, toSymbol: string) => {
    console.log(`Margin shift requested: ${fromSymbol} → ${toSymbol}`);
  }, []);

  const activeAlerts = data?.alerts.filter(a => !dismissedAlerts.has(a.id)) || [];

  if (!data) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="animate-morph w-16 h-16 bg-energy-green/10 border border-energy-green/20" />
      </div>
    );
  }

  // Determine if we're in compact mode (tablet or mobile)
  const isCompact = isMobile; // useIsMobile triggers at 768px

  if (isCompact) {
    return (
      <div className="h-screen w-screen bg-background flex flex-col items-center justify-center px-8 text-center">
        <div className="w-12 h-12 mb-6 border border-energy-green/20 rounded-sm flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-energy-green/60">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 21h8M12 17v4" />
          </svg>
        </div>
        <h2 className="text-sm font-grotesk text-foreground tracking-wide mb-2">Desktop Required</h2>
        <p className="text-[0.7rem] font-grotesk text-muted-foreground leading-relaxed max-w-xs">
          Aphelion is optimized for desktop trading. Open this page on a PC or laptop for the full experience.
        </p>
        <button
          onClick={() => navigate("/")}
          className="mt-6 text-[0.6rem] font-mono-system text-energy-green/70 border border-energy-green/20 px-4 py-2 rounded-sm hover:border-energy-green/40 transition-colors"
        >
          ← Back to Landing
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-background overflow-hidden relative select-none">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute w-[600px] h-[600px] rounded-full opacity-[0.03]"
          style={{
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            background: "radial-gradient(circle, hsl(155, 100%, 50%) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-3 md:px-6 py-3 md:py-4">
        <div className="flex items-center gap-2 md:gap-3">
          {/* Mobile panel toggles */}
          {isCompact && (
            <button
              onClick={() => { setLeftOpen(!leftOpen); setRightOpen(false); }}
              className={`w-7 h-7 flex items-center justify-center rounded-sm border transition-colors ${
                leftOpen ? "border-energy-green/40 text-energy-green" : "border-border/40 text-muted-foreground"
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="2" width="4" height="10" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="7" y="2" width="6" height="10" rx="1" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 1"/></svg>
            </button>
          )}
          <div className={`w-2 h-2 rounded-full ${data.wsConnected ? 'bg-energy-green' : 'bg-idle-amber'} animate-pulse-ring`} />
          <button
            onClick={() => navigate("/")}
            className="text-[0.55rem] md:text-[0.65rem] font-grotesk text-muted-foreground tracking-[0.2em] md:tracking-[0.3em] uppercase hover:text-energy-green transition-colors cursor-pointer bg-transparent border-none p-0"
          >
            {isCompact ? "Aphelion" : "Aphelion · Margin Intelligence"}
          </button>
          {data.wsConnected ? (
            <span className="text-[0.5rem] font-mono-system text-energy-green/50">LIVE</span>
          ) : (
            <span className="text-[0.5rem] font-mono-system text-idle-amber/50">{data.isLive ? "API" : "DEMO"}</span>
          )}
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {/* View toggle - horizontal scroll on mobile */}
          <div className="flex items-center gap-0.5 md:gap-1 text-[0.5rem] md:text-[0.6rem] font-mono-system overflow-x-auto no-scrollbar">
            {(["orbit", "timeline", "funding", "depth", "pnl"] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-1.5 md:px-2 py-1 rounded-sm transition-colors duration-500 whitespace-nowrap ${
                  viewMode === mode ? "text-energy-green bg-energy-green/10" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {mode.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Mobile right panel toggle */}
          {isCompact && (
            <button
              onClick={() => { setRightOpen(!rightOpen); setLeftOpen(false); }}
              className={`w-7 h-7 flex items-center justify-center rounded-sm border transition-colors ${
                rightOpen ? "border-energy-green/40 text-energy-green" : "border-border/40 text-muted-foreground"
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="2" width="6" height="10" rx="1" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 1"/><rect x="9" y="2" width="4" height="10" rx="1" stroke="currentColor" strokeWidth="1.2"/></svg>
            </button>
          )}

          {/* Wallet */}
          <button
            onClick={wallet.connected ? wallet.disconnect : wallet.connect}
            className="elastic-hover ripple-container text-[0.5rem] md:text-[0.6rem] font-mono-system px-2 md:px-3 py-1.5 border border-border/50 rounded-sm text-muted-foreground hover:text-foreground hover:border-energy-green/30 transition-colors duration-500"
          >
            {wallet.connecting ? (
              "..."
            ) : wallet.connected ? (
              <span className="flex items-center gap-1.5">
                {wallet.walletIcon && (
                  <img src={wallet.walletIcon} alt="" className="w-3 h-3" />
                )}
                <span className="w-1.5 h-1.5 rounded-full bg-energy-green" />
                {wallet.address?.slice(0, 4)}···{wallet.address?.slice(-4)}
              </span>
            ) : (
              isCompact ? "connect" : "connect wallet"
            )}
          </button>
        </div>
      </div>

      {/* Overlay backdrop for mobile panels */}
      {isCompact && (leftOpen || rightOpen) && (
        <div
          className="absolute inset-0 z-20 bg-background/60 backdrop-blur-sm"
          onClick={() => { setLeftOpen(false); setRightOpen(false); }}
        />
      )}

      {/* Main content area */}
      <div className="h-full w-full pt-12 md:pt-14 flex relative">

        {/* Left column - slide-over on mobile, fixed on desktop */}
        <div
          className={`
            ${isCompact
              ? `absolute left-0 top-12 bottom-0 z-30 w-72 bg-background border-r border-border/20 transition-transform duration-300 ease-out ${leftOpen ? "translate-x-0" : "-translate-x-full"}`
              : "w-72 h-full flex-shrink-0"
            }
            flex flex-col justify-between px-4 md:px-6 z-10 relative py-4 overflow-y-auto
          `}
        >
          <div className="flex flex-col gap-6">
            <MarginField account={data.account} />
            <div className="border-t border-border/20 pt-4">
              <EfficiencyCore score={data.efficiencyScore} />
            </div>
          </div>
          <div className="mt-4">
            <FloatingTradePanel>
              <TradePanel
                account={wallet.address}
                signMessage={wallet.signMessage}
                selectedSymbol={selectedSymbol}
                defaultSymbol={data.positions[0]?.symbol || "BTC"}
                markPrice={data.prices.find(p => p.symbol === (selectedSymbol || data.positions[0]?.symbol || "BTC"))
                  ? parseFloat(data.prices.find(p => p.symbol === (selectedSymbol || data.positions[0]?.symbol || "BTC"))!.mark)
                  : undefined}
                availableSymbols={data.prices.map(p => p.symbol).sort()}
                symbolPrices={data.prices.map(p => ({ symbol: p.symbol, mark: p.mark })).sort((a, b) => a.symbol.localeCompare(b.symbol))}
                onSymbolChange={sym => setSelectedSymbol(sym)}
              />
            </FloatingTradePanel>
          </div>
        </div>

        {/* Center */}
        <div className="flex-1 h-full relative min-w-0">
          {viewMode === "orbit" ? (
            <OrbitalField
              positions={data.positions}
              prices={data.prices}
              equity={parseFloat(data.account.account_equity)}
              onPositionSelect={(sym) => {
                setSelectedSymbol(sym);
                if (isCompact && sym) setRightOpen(true);
              }}
              selectedSymbol={selectedSymbol}
              onMarginShift={handleMarginShift}
              recentTrades={data.recentTrades}
            />
          ) : viewMode === "timeline" ? (
            <div className="h-full flex items-center justify-center px-4 md:px-12">
              <EquityCurve portfolio={data.portfolio} className="w-full h-48 md:h-64" />
            </div>
          ) : viewMode === "funding" ? (
            <div className="h-full flex items-center justify-center px-4 md:px-12">
              <FundingHeatmap
                funding={data.funding}
                symbols={data.positions.map(p => p.symbol)}
                className="w-full"
              />
            </div>
          ) : viewMode === "depth" ? (
            <div className="h-full flex items-center justify-center px-4 md:px-12">
              <OrderbookDepth
                symbol={selectedSymbol || data.positions[0]?.symbol || "BTC"}
                externalData={data.orderbook}
                className="w-full h-[300px] md:h-[400px]"
              />
            </div>
          ) : viewMode === "pnl" ? (
            <div className="h-full flex items-center justify-center px-4 md:px-12">
              <PnlBreakdown positions={data.positions} prices={data.prices} account={wallet.address} />
            </div>
          ) : null}

          {/* Center overlay - equity */}
          {viewMode === "orbit" && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-center">
              <div className="text-[0.5rem] font-grotesk text-muted-foreground tracking-[0.3em] uppercase mb-1">
                Equity
              </div>
              <MechanicalCounter
                value={parseFloat(data.account.account_equity)}
                prefix="$"
                decimals={0}
                className="text-base md:text-lg text-foreground/80"
              />
            </div>
          )}
        </div>

        {/* Right column - slide-over on mobile, fixed on desktop */}
        <div
          className={`
            ${isCompact
              ? `absolute right-0 top-12 bottom-0 z-30 w-80 bg-background border-l border-border/20 transition-transform duration-300 ease-out ${rightOpen ? "translate-x-0" : "translate-x-full"}`
              : "w-80 h-full flex-shrink-0"
            }
            flex flex-col z-10 relative overflow-hidden
          `}
        >
          {/* Positions - scrollable */}
          <div className="flex-1 overflow-y-auto pt-2 min-h-0">
            <div className="text-[0.55rem] font-grotesk text-muted-foreground tracking-[0.2em] uppercase px-4 mb-2">
              Active Positions
            </div>
            {data.positions.map(pos => (
              <PositionDetail
                key={pos.symbol}
                position={pos}
                price={data.prices.find(p => p.symbol === pos.symbol)}
                isSelected={selectedSymbol === pos.symbol}
                onSelect={() => setSelectedSymbol(selectedSymbol === pos.symbol ? null : pos.symbol)}
                account={wallet.address}
                signMessage={wallet.signMessage}
              />
            ))}
          </div>

          {/* Open Orders */}
          <div className="shrink-0 max-h-48 overflow-y-auto border-t border-border/20">
            <OpenOrders
              orders={data.openOrders}
              account={wallet.address}
              signMessage={wallet.signMessage}
            />
          </div>

          {/* Order History */}
          <div className="shrink-0 max-h-40 overflow-y-auto border-t border-border/20">
            <OrderHistory orders={data.orderHistory} />
          </div>

          {/* Intelligence - capped height */}
          {activeAlerts.length > 0 && (
            <div className="shrink-0 max-h-48 overflow-y-auto px-4 pb-4 pt-2 border-t border-border/20">
              <div className="text-[0.55rem] font-grotesk text-muted-foreground tracking-[0.2em] uppercase mb-2">
                Intelligence
              </div>
              <AlertStream
                alerts={activeAlerts}
                onDismiss={handleDismissAlert}
                positions={data.positions}
                account={wallet.address}
                signMessage={wallet.signMessage}
              />
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between px-3 md:px-6 py-2 md:py-3">
        <div className="flex items-center gap-3 md:gap-6 text-[0.45rem] md:text-[0.55rem] font-mono-system text-muted-foreground">
          <span>
            24h funding:{" "}
            <span className={data.positions.reduce((s, p) => s + parseFloat(p.funding), 0) >= 0 ? "text-energy-green" : "text-risk-red"}>
              ${Math.abs(data.positions.reduce((s, p) => s + parseFloat(p.funding), 0)).toFixed(2)}
            </span>
          </span>
          {!isCompact && (
            <>
              <span>maker: {(parseFloat(data.account.maker_fee) * 100).toFixed(3)}%</span>
              <span>taker: {(parseFloat(data.account.taker_fee) * 100).toFixed(3)}%</span>
            </>
          )}
        </div>
        <div className="text-[0.4rem] md:text-[0.5rem] font-grotesk text-muted-foreground/40 tracking-wider">
          {isCompact ? "APHELION v1.0" : "APHELION MARGIN INTELLIGENCE v1.0"}
        </div>
      </div>
    </div>
  );
};

export default Index;