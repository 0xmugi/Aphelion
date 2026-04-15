import { useRef, useEffect, useState, useMemo } from "react";
import type { OrderbookData } from "@/lib/pacifica-api";

interface Props {
  symbol: string;
  externalData?: OrderbookData | null;
  className?: string;
}

// Demo orderbook data
function generateDemoOrderbook(symbol: string): OrderbookData {
  const basePrice = symbol === "BTC" ? 105200 : symbol === "ETH" ? 3240 : symbol === "SOL" ? 172 : symbol === "AAVE" ? 285 : 0.192;
  const spread = basePrice * 0.0005;

  const bids: { p: string; a: string; n: number }[] = [];
  const asks: { p: string; a: string; n: number }[] = [];

  for (let i = 0; i < 15; i++) {
    const bidPrice = basePrice - spread / 2 - i * basePrice * 0.0002;
    const askPrice = basePrice + spread / 2 + i * basePrice * 0.0002;
    const bidAmount = (Math.random() * 5 + 0.5) * (1 + Math.random() * 3);
    const askAmount = (Math.random() * 5 + 0.5) * (1 + Math.random() * 3);

    bids.push({ p: bidPrice.toFixed(2), a: bidAmount.toFixed(5), n: Math.floor(Math.random() * 8) + 1 });
    asks.push({ p: askPrice.toFixed(2), a: askAmount.toFixed(5), n: Math.floor(Math.random() * 8) + 1 });
  }

  return { s: symbol, l: [bids, asks], t: Date.now() };
}

export function OrderbookDepth({ symbol, externalData, className = "" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [demoBook, setDemoBook] = useState<OrderbookData | null>(null);
  const [hoveredLevel, setHoveredLevel] = useState<{ side: "bid" | "ask"; index: number; x: number; y: number } | null>(null);

  // Use external WS data if available, otherwise demo
  const orderbook = externalData || demoBook;

  useEffect(() => {
    if (externalData) return; // skip demo when WS is feeding data
    setDemoBook(generateDemoOrderbook(symbol));
    const interval = setInterval(() => {
      setDemoBook(generateDemoOrderbook(symbol));
    }, 3000);
    return () => clearInterval(interval);
  }, [symbol, externalData]);

  // Cumulative depth data
  const depthData = useMemo(() => {
    if (!orderbook) return null;

    const [bids, asks] = orderbook.l;
    let cumBid = 0;
    let cumAsk = 0;

    const bidLevels = bids.map(b => {
      cumBid += parseFloat(b.a);
      return { price: parseFloat(b.p), amount: parseFloat(b.a), cumulative: cumBid, orders: b.n };
    });

    const askLevels = asks.map(a => {
      cumAsk += parseFloat(a.a);
      return { price: parseFloat(a.p), amount: parseFloat(a.a), cumulative: cumAsk, orders: a.n };
    });

    const maxCum = Math.max(cumBid, cumAsk);
    const midPrice = (bidLevels[0]?.price + askLevels[0]?.price) / 2;
    const spread = askLevels[0]?.price - bidLevels[0]?.price;

    return { bidLevels, askLevels, maxCum, midPrice, spread };
  }, [orderbook]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !depthData) return;

    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;

    const { bidLevels, askLevels, maxCum, midPrice, spread } = depthData;
    const padding = { top: 30, bottom: 30, left: 10, right: 10 };
    const drawW = w - padding.left - padding.right;
    const drawH = h - padding.top - padding.bottom;

    ctx.clearRect(0, 0, w, h);

    // Mid price label
    ctx.font = '600 11px "JetBrains Mono", monospace';
    ctx.fillStyle = "hsl(200, 10%, 75%)";
    ctx.textAlign = "center";
    ctx.fillText(`${symbol} · $${midPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, w / 2, 16);

    // Spread label
    ctx.font = '400 8px "Space Grotesk", sans-serif';
    ctx.fillStyle = "hsl(200, 8%, 45%)";
    ctx.fillText(`spread: $${spread.toFixed(2)} (${((spread / midPrice) * 100).toFixed(4)}%)`, w / 2, 26);

    const centerX = w / 2;

    // Draw bid side (left) - cumulative depth area
    const bidPoints: { x: number; y: number }[] = [];
    bidLevels.forEach((level, i) => {
      const x = centerX - (i + 1) / bidLevels.length * (drawW / 2);
      const y = padding.top + drawH - (level.cumulative / maxCum) * drawH;
      bidPoints.push({ x, y });
    });

    // Bid fill
    if (bidPoints.length > 0) {
      ctx.beginPath();
      ctx.moveTo(centerX, padding.top + drawH);
      bidPoints.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(bidPoints[bidPoints.length - 1].x, padding.top + drawH);
      ctx.closePath();
      const bidGrad = ctx.createLinearGradient(0, padding.top, 0, padding.top + drawH);
      bidGrad.addColorStop(0, "hsla(155, 100%, 50%, 0.15)");
      bidGrad.addColorStop(1, "hsla(155, 100%, 50%, 0.02)");
      ctx.fillStyle = bidGrad;
      ctx.fill();

      // Bid line
      ctx.beginPath();
      ctx.moveTo(centerX, padding.top + drawH);
      bidPoints.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.strokeStyle = "hsla(155, 100%, 50%, 0.6)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Bid level bars
      bidLevels.forEach((level, i) => {
        const barW = (level.amount / maxCum) * (drawW / 4);
        const x = centerX - barW;
        const barH = drawH / bidLevels.length;
        const y = padding.top + i * barH;

        ctx.fillStyle = `hsla(155, 100%, 50%, ${0.05 + (level.amount / maxCum) * 0.2})`;
        ctx.fillRect(x, y, barW, barH - 1);
      });
    }

    // Draw ask side (right)
    const askPoints: { x: number; y: number }[] = [];
    askLevels.forEach((level, i) => {
      const x = centerX + (i + 1) / askLevels.length * (drawW / 2);
      const y = padding.top + drawH - (level.cumulative / maxCum) * drawH;
      askPoints.push({ x, y });
    });

    if (askPoints.length > 0) {
      ctx.beginPath();
      ctx.moveTo(centerX, padding.top + drawH);
      askPoints.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(askPoints[askPoints.length - 1].x, padding.top + drawH);
      ctx.closePath();
      const askGrad = ctx.createLinearGradient(0, padding.top, 0, padding.top + drawH);
      askGrad.addColorStop(0, "hsla(0, 85%, 55%, 0.15)");
      askGrad.addColorStop(1, "hsla(0, 85%, 55%, 0.02)");
      ctx.fillStyle = askGrad;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(centerX, padding.top + drawH);
      askPoints.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.strokeStyle = "hsla(0, 85%, 55%, 0.6)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      askLevels.forEach((level, i) => {
        const barW = (level.amount / maxCum) * (drawW / 4);
        const barH = drawH / askLevels.length;
        const y = padding.top + i * barH;

        ctx.fillStyle = `hsla(0, 85%, 55%, ${0.05 + (level.amount / maxCum) * 0.2})`;
        ctx.fillRect(centerX, y, barW, barH - 1);
      });
    }

    // Center divider
    ctx.beginPath();
    ctx.moveTo(centerX, padding.top);
    ctx.lineTo(centerX, padding.top + drawH);
    ctx.strokeStyle = "hsla(220, 10%, 20%, 0.6)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Bottom labels
    ctx.font = '500 8px "JetBrains Mono", monospace';
    ctx.fillStyle = "hsla(155, 100%, 50%, 0.5)";
    ctx.textAlign = "center";
    ctx.fillText("BIDS", centerX - drawW / 4, h - 8);
    ctx.fillStyle = "hsla(0, 85%, 55%, 0.5)";
    ctx.fillText("ASKS", centerX + drawW / 4, h - 8);

    // Price labels at edges
    if (bidLevels.length > 0) {
      ctx.font = '400 7px "JetBrains Mono", monospace';
      ctx.fillStyle = "hsl(200, 8%, 40%)";
      ctx.textAlign = "left";
      ctx.fillText(`$${bidLevels[bidLevels.length - 1].price.toFixed(0)}`, padding.left, h - 8);
      ctx.textAlign = "right";
      ctx.fillText(`$${askLevels[askLevels.length - 1].price.toFixed(0)}`, w - padding.right, h - 8);
    }
  }, [depthData, symbol]);

  // Mouse handler for hover
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const centerX = rect.width / 2;
      const side = x < centerX ? "bid" : "ask";
      const levels = depthData ? (side === "bid" ? depthData.bidLevels.length : depthData.askLevels.length) : 0;
      const drawH = rect.height - 60;
      const index = Math.floor(((e.clientY - rect.top - 30) / drawH) * levels);

      if (index >= 0 && index < levels) {
        setHoveredLevel({ side: side as "bid" | "ask", index, x: e.clientX - rect.left, y: e.clientY - rect.top });
      } else {
        setHoveredLevel(null);
      }
    };

    const handleLeave = () => setHoveredLevel(null);

    canvas.addEventListener("mousemove", handleMouse);
    canvas.addEventListener("mouseleave", handleLeave);
    return () => {
      canvas.removeEventListener("mousemove", handleMouse);
      canvas.removeEventListener("mouseleave", handleLeave);
    };
  }, [depthData]);

  if (!depthData) return null;

  const hoveredData = hoveredLevel
    ? (hoveredLevel.side === "bid" ? depthData.bidLevels : depthData.askLevels)[hoveredLevel.index]
    : null;

  return (
    <div className={`relative ${className}`}>
      <canvas ref={canvasRef} className="w-full h-full" />

      {/* Hover tooltip */}
      {hoveredLevel && hoveredData && (
        <div
          className="absolute pointer-events-none z-10 surface-glass px-2 py-1.5 rounded-sm"
          style={{ left: hoveredLevel.x + 10, top: hoveredLevel.y - 30 }}
        >
          <div className="text-[0.6rem] font-mono-system">
            <span className={hoveredLevel.side === "bid" ? "text-energy-green" : "text-risk-red"}>
              ${hoveredData.price.toFixed(2)}
            </span>
          </div>
          <div className="text-[0.5rem] text-muted-foreground font-grotesk">
            {hoveredData.amount.toFixed(4)} · {hoveredData.orders} orders · cum {hoveredData.cumulative.toFixed(2)}
          </div>
        </div>
      )}
    </div>
  );
}
