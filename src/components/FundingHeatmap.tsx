import { useRef, useEffect, useMemo } from "react";
import type { FundingEvent } from "@/lib/pacifica-api";

interface Props {
  funding: FundingEvent[];
  symbols: string[];
  className?: string;
}

export function FundingHeatmap({ funding, symbols, className = "" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Group funding by symbol and hour buckets
  const heatData = useMemo(() => {
    if (!funding.length || !symbols.length) return null;

    const now = Date.now();
    const bucketCount = 48; // 48 hours
    const bucketMs = 3600000;

    const grid: number[][] = symbols.map(() => new Array(bucketCount).fill(0));

    funding.forEach(f => {
      const symIdx = symbols.indexOf(f.symbol);
      if (symIdx === -1) return;
      const hoursAgo = Math.floor((now - f.created_at) / bucketMs);
      if (hoursAgo >= 0 && hoursAgo < bucketCount) {
        grid[symIdx][bucketCount - 1 - hoursAgo] += parseFloat(f.payout);
      }
    });

    // Find max absolute value for normalization
    let maxAbs = 0;
    grid.forEach(row => row.forEach(v => { maxAbs = Math.max(maxAbs, Math.abs(v)); }));

    return { grid, maxAbs: maxAbs || 1, bucketCount };
  }, [funding, symbols]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !heatData) return;

    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;

    const { grid, maxAbs, bucketCount } = heatData;
    const labelWidth = 48;
    const cellW = (w - labelWidth) / bucketCount;
    const cellH = Math.min(24, (h - 20) / symbols.length);
    const topPad = 14;

    ctx.clearRect(0, 0, w, h);

    // Header
    ctx.font = '500 9px "Space Grotesk", sans-serif';
    ctx.fillStyle = "hsl(200, 8%, 45%)";
    ctx.fillText("48h ago", labelWidth, topPad - 3);
    ctx.textAlign = "right";
    ctx.fillText("now", w - 2, topPad - 3);
    ctx.textAlign = "left";

    // Draw grid
    grid.forEach((row, symIdx) => {
      const y = topPad + symIdx * cellH;

      // Symbol label
      ctx.font = '600 10px "JetBrains Mono", monospace';
      ctx.fillStyle = "hsl(200, 10%, 60%)";
      ctx.textAlign = "left";
      ctx.fillText(symbols[symIdx], 2, y + cellH * 0.7);

      row.forEach((val, colIdx) => {
        const x = labelWidth + colIdx * cellW;
        const norm = val / maxAbs; // -1 to 1

        let r: number, g: number, b: number, a: number;
        if (val < 0) {
          // Funding drain → cold blue bleed
          const intensity = Math.abs(norm);
          r = 40;
          g = 80 + intensity * 60;
          b = 180 + intensity * 75;
          a = 0.15 + intensity * 0.7;
        } else if (val > 0) {
          // Funding received → warm green
          const intensity = Math.abs(norm);
          r = 40;
          g = 180 + intensity * 75;
          b = 80;
          a = 0.15 + intensity * 0.6;
        } else {
          r = 30; g = 35; b = 45; a = 0.2;
        }

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;

        // Rounded cells
        const pad = 1;
        const rx = x + pad;
        const ry = y + pad;
        const rw = cellW - pad * 2;
        const rh = cellH - pad * 2;
        const radius = 2;

        ctx.beginPath();
        ctx.moveTo(rx + radius, ry);
        ctx.lineTo(rx + rw - radius, ry);
        ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + radius);
        ctx.lineTo(rx + rw, ry + rh - radius);
        ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - radius, ry + rh);
        ctx.lineTo(rx + radius, ry + rh);
        ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - radius);
        ctx.lineTo(rx, ry + radius);
        ctx.quadraticCurveTo(rx, ry, rx + radius, ry);
        ctx.closePath();
        ctx.fill();
      });

      // Cumulative text
      const cumulative = row.reduce((s, v) => s + v, 0);
      ctx.font = '500 8px "JetBrains Mono", monospace';
      ctx.textAlign = "left";
      ctx.fillStyle = cumulative >= 0 ? "hsl(155, 100%, 50%)" : "hsl(210, 80%, 55%)";
      // Right side after grid
    });

    // Legend
    const legendY = topPad + symbols.length * cellH + 8;
    ctx.font = '400 8px "Space Grotesk", sans-serif';
    ctx.textAlign = "left";

    // Drain legend
    ctx.fillStyle = "rgba(40, 120, 255, 0.6)";
    ctx.fillRect(labelWidth, legendY, 10, 6);
    ctx.fillStyle = "hsl(200, 8%, 45%)";
    ctx.fillText("drain", labelWidth + 14, legendY + 6);

    // Earn legend
    ctx.fillStyle = "rgba(40, 220, 80, 0.5)";
    ctx.fillRect(labelWidth + 60, legendY, 10, 6);
    ctx.fillStyle = "hsl(200, 8%, 45%)";
    ctx.fillText("earned", labelWidth + 74, legendY + 6);

  }, [heatData, symbols]);

  if (!heatData) return null;

  const height = 14 + symbols.length * 24 + 20;

  return (
    <div className={className}>
      <div className="text-[0.55rem] font-grotesk text-muted-foreground tracking-[0.2em] uppercase mb-2">
        Funding Drain · 48h
      </div>
      <canvas
        ref={canvasRef}
        className="w-full"
        style={{ height: `${height}px` }}
      />
    </div>
  );
}
