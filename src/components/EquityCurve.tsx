import { useRef, useEffect } from "react";
import type { PortfolioPoint } from "@/lib/pacifica-api";

interface Props {
  portfolio: PortfolioPoint[];
  className?: string;
}

export function EquityCurve({ portfolio, className = "" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || portfolio.length < 2) return;

    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;

    const equities = portfolio.map(p => parseFloat(p.account_equity));
    const min = Math.min(...equities) * 0.998;
    const max = Math.max(...equities) * 1.002;
    const range = max - min || 1;

    const toX = (i: number) => (i / (portfolio.length - 1)) * w;
    const toY = (v: number) => h - ((v - min) / range) * h * 0.85 - h * 0.05;

    // Fill gradient
    ctx.beginPath();
    ctx.moveTo(toX(0), h);
    equities.forEach((eq, i) => ctx.lineTo(toX(i), toY(eq)));
    ctx.lineTo(toX(equities.length - 1), h);
    ctx.closePath();

    const lastEq = equities[equities.length - 1];
    const firstEq = equities[0];
    const isPositive = lastEq >= firstEq;
    const baseHue = isPositive ? "155, 100%, 50%" : "0, 85%, 55%";

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, `hsla(${baseHue}, 0.08)`);
    grad.addColorStop(1, `hsla(${baseHue}, 0)`);
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    equities.forEach((eq, i) => {
      if (i === 0) ctx.moveTo(toX(i), toY(eq));
      else ctx.lineTo(toX(i), toY(eq));
    });
    ctx.strokeStyle = `hsl(${baseHue})`;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.stroke();

    // End dot
    const lastX = toX(equities.length - 1);
    const lastY = toY(lastEq);
    ctx.beginPath();
    ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${baseHue})`;
    ctx.fill();

    // Pulse
    ctx.beginPath();
    ctx.arc(lastX, lastY, 6, 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(${baseHue}, 0.3)`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }, [portfolio]);

  return (
    <div className={`${className}`}>
      <div className="text-[0.55rem] font-grotesk text-muted-foreground tracking-[0.2em] uppercase mb-2">
        Equity Timeline
      </div>
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
