import { useRef, useEffect, useState, useMemo } from "react";
import type { Candle } from "@/lib/pacifica-api";

interface Props {
  symbol: string;
  className?: string;
}

// Demo kline data generator
function generateDemoCandles(symbol: string, count: number = 24): Candle[] {
  const basePrice = symbol === "BTC" ? 105200 : symbol === "ETH" ? 3240 : symbol === "SOL" ? 172 : symbol === "AAVE" ? 285 : 0.192;
  const candles: Candle[] = [];
  const now = Date.now();
  const interval = 3600000; // 1h
  let price = basePrice * (0.97 + Math.random() * 0.06);

  for (let i = count; i >= 0; i--) {
    const vol = basePrice * 0.005 * (0.5 + Math.random() * 2);
    const o = price;
    const direction = Math.random() - 0.48;
    const range = vol * (0.5 + Math.random());
    const c = o + direction * range;
    const h = Math.max(o, c) + Math.random() * vol * 0.5;
    const l = Math.min(o, c) - Math.random() * vol * 0.5;
    price = c;

    candles.push({
      t: now - i * interval,
      T: now - (i - 1) * interval,
      s: symbol,
      i: "1h",
      o: o.toFixed(2),
      c: c.toFixed(2),
      h: h.toFixed(2),
      l: l.toFixed(2),
      v: (Math.random() * 100).toFixed(4),
      n: Math.floor(Math.random() * 50) + 5,
    });
  }
  return candles;
}

export function MiniKline({ symbol, className = "" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [candles, setCandles] = useState<Candle[]>([]);

  useEffect(() => {
    setCandles(generateDemoCandles(symbol));
  }, [symbol]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length < 2) return;

    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;

    const prices = candles.flatMap(c => [parseFloat(c.h), parseFloat(c.l)]);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;

    const candleW = Math.max(2, (w - 4) / candles.length - 1);
    const gap = 1;

    ctx.clearRect(0, 0, w, h);

    candles.forEach((candle, i) => {
      const o = parseFloat(candle.o);
      const c = parseFloat(candle.c);
      const hi = parseFloat(candle.h);
      const lo = parseFloat(candle.l);

      const x = 2 + i * (candleW + gap);
      const isGreen = c >= o;

      const toY = (v: number) => h - 2 - ((v - min) / range) * (h - 4);

      // Wick
      const wickX = x + candleW / 2;
      ctx.beginPath();
      ctx.moveTo(wickX, toY(hi));
      ctx.lineTo(wickX, toY(lo));
      ctx.strokeStyle = isGreen ? "hsla(155, 100%, 50%, 0.4)" : "hsla(0, 85%, 55%, 0.4)";
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Body
      const bodyTop = toY(Math.max(o, c));
      const bodyBottom = toY(Math.min(o, c));
      const bodyH = Math.max(1, bodyBottom - bodyTop);

      ctx.fillStyle = isGreen ? "hsla(155, 100%, 50%, 0.6)" : "hsla(0, 85%, 55%, 0.6)";
      ctx.fillRect(x, bodyTop, candleW, bodyH);
    });

    // Last price line
    const lastClose = parseFloat(candles[candles.length - 1].c);
    const lastY = h - 2 - ((lastClose - min) / range) * (h - 4);
    ctx.beginPath();
    ctx.moveTo(0, lastY);
    ctx.lineTo(w, lastY);
    ctx.strokeStyle = "hsla(200, 10%, 50%, 0.3)";
    ctx.lineWidth = 0.5;
    ctx.setLineDash([2, 2]);
    ctx.stroke();
    ctx.setLineDash([]);

  }, [candles]);

  if (candles.length === 0) return null;

  const firstClose = parseFloat(candles[0]?.c || "0");
  const lastClose = parseFloat(candles[candles.length - 1]?.c || "0");
  const change = ((lastClose - firstClose) / firstClose) * 100;

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[0.5rem] text-muted-foreground font-grotesk tracking-wider">24h</span>
        <span className={`text-[0.5rem] font-mono-system ${change >= 0 ? "text-energy-green" : "text-risk-red"}`}>
          {change >= 0 ? "+" : ""}{change.toFixed(2)}%
        </span>
      </div>
      <canvas ref={canvasRef} className="w-full" style={{ height: "32px" }} />
    </div>
  );
}
