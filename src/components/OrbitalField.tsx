import { useRef, useEffect, useMemo, useCallback, useState } from "react";
import type { Position, PriceInfo } from "@/lib/pacifica-api";
import type { WsTradeUpdate } from "@/lib/pacifica-ws";
import { toast } from "sonner";

interface Props {
  positions: Position[];
  prices: PriceInfo[];
  equity: number;
  onPositionSelect: (symbol: string) => void;
  selectedSymbol: string | null;
  onMarginShift?: (fromSymbol: string, toSymbol: string) => void;
  recentTrades?: WsTradeUpdate[];
}

interface PositionNode {
  symbol: string;
  side: "bid" | "ask";
  notional: number;
  mass: number;
  pnl: number;
  fundingCost: number;
  angle: number;
  orbitRadius: number;
  size: number;
  color: string;
  dimColor: string;
  isolated: boolean;
  margin: number;
}

interface TradeParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  life: number;
  maxLife: number;
  symbol: string;
}

export function OrbitalField({ positions, prices, equity, onPositionSelect, selectedSymbol, onMarginShift, recentTrades = [] }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>();
  const mouseRef = useRef({ x: 0, y: 0 });
  const timeRef = useRef(0);
  const particlesRef = useRef<TradeParticle[]>([]);
  const lastTradeCountRef = useRef(0);

  // Drag state
  const dragRef = useRef<{
    dragging: boolean;
    fromSymbol: string | null;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  }>({ dragging: false, fromSymbol: null, startX: 0, startY: 0, currentX: 0, currentY: 0 });

  const [dragState, setDragState] = useState<{
    active: boolean;
    fromSymbol: string | null;
    nearTarget: string | null;
  }>({ active: false, fromSymbol: null, nearTarget: null });

  const positionData = useMemo((): PositionNode[] => {
    return positions.map((pos, i) => {
      const price = prices.find(p => p.symbol === pos.symbol);
      const notional = parseFloat(pos.amount) * parseFloat(pos.entry_price);
      const mass = notional / equity;
      const pnl = price ? (parseFloat(price.mark) - parseFloat(pos.entry_price)) * parseFloat(pos.amount) * (pos.side === "bid" ? 1 : -1) : 0;
      const fundingCost = parseFloat(pos.funding);
      const angle = (i / positions.length) * Math.PI * 2;

      return {
        symbol: pos.symbol,
        side: pos.side,
        notional,
        mass,
        pnl,
        fundingCost,
        angle,
        orbitRadius: 120 + mass * 180,
        size: 16 + mass * 40,
        color: pnl >= 0 ? "hsl(155, 100%, 50%)" : "hsl(0, 85%, 55%)",
        dimColor: pnl >= 0 ? "hsl(155, 60%, 30%)" : "hsl(0, 50%, 25%)",
        isolated: pos.isolated,
        margin: parseFloat(pos.margin),
      };
    });
  }, [positions, prices, equity]);

  const getPositionXY = useCallback((pd: PositionNode, time: number, cx: number, cy: number) => {
    const speed = 0.3 + (1 - pd.mass) * 0.5;
    const x = cx + Math.cos(pd.angle + time * speed * 0.001) * pd.orbitRadius;
    const y = cy + Math.sin(pd.angle + time * speed * 0.001) * pd.orbitRadius * 0.6;
    return { x, y };
  }, []);

  // Spawn trade particles when new trades arrive
  useEffect(() => {
    if (recentTrades.length <= lastTradeCountRef.current) {
      lastTradeCountRef.current = recentTrades.length;
      return;
    }

    const newTrades = recentTrades.slice(lastTradeCountRef.current);
    lastTradeCountRef.current = recentTrades.length;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const cx = w / 2;
    const cy = h / 2;

    for (const trade of newTrades) {
      const pd = positionData.find(p => p.symbol === trade.s);
      if (!pd) continue;

      const { x, y } = getPositionXY(pd, timeRef.current, cx, cy);
      const isBuy = trade.d === "open_long" || trade.d === "close_short";
      const tradeSize = parseFloat(trade.a) * parseFloat(trade.p);
      const particleCount = Math.min(Math.max(Math.floor(tradeSize / 500), 3), 15);

      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.5 + Math.random() * 2;
        particlesRef.current.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 1.5 + Math.random() * 3,
          alpha: 0.8 + Math.random() * 0.2,
          color: isBuy ? "155, 100%, 50%" : "0, 85%, 55%",
          life: 0,
          maxLife: 60 + Math.random() * 40,
          symbol: trade.s,
        });
      }
    }

    // Cap particles
    if (particlesRef.current.length > 200) {
      particlesRef.current = particlesRef.current.slice(-200);
    }
  }, [recentTrades, positionData, getPositionXY]);

  const findHitPosition = useCallback((mx: number, my: number, cx: number, cy: number, time: number): PositionNode | null => {
    for (const pd of positionData) {
      const { x, y } = getPositionXY(pd, time, cx, cy);
      const dist = Math.sqrt((mx - x) ** 2 + (my - y) ** 2);
      if (dist < pd.size + 10) return pd;
    }
    return null;
  }, [positionData, getPositionXY]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const handleMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };

      if (dragRef.current.dragging) {
        dragRef.current.currentX = mouseRef.current.x;
        dragRef.current.currentY = mouseRef.current.y;

        const w = canvas.width / dpr;
        const h = canvas.height / dpr;
        const cx = w / 2;
        const cy = h / 2;
        const hit = findHitPosition(mouseRef.current.x, mouseRef.current.y, cx, cy, timeRef.current);
        const nearTarget = hit && hit.symbol !== dragRef.current.fromSymbol ? hit.symbol : null;
        setDragState(prev => ({ ...prev, nearTarget }));
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      const hit = findHitPosition(mx, my, w / 2, h / 2, timeRef.current);
      if (hit) {
        dragRef.current = { dragging: true, fromSymbol: hit.symbol, startX: mx, startY: my, currentX: mx, currentY: my };
        setDragState({ active: true, fromSymbol: hit.symbol, nearTarget: null });
        canvas.style.cursor = "grabbing";
      }
    };

    const handleMouseUp = () => {
      if (dragRef.current.dragging && dragRef.current.fromSymbol) {
        const w = canvas.width / dpr;
        const h = canvas.height / dpr;
        const target = findHitPosition(dragRef.current.currentX, dragRef.current.currentY, w / 2, h / 2, timeRef.current);
        if (target && target.symbol !== dragRef.current.fromSymbol) {
          onMarginShift?.(dragRef.current.fromSymbol, target.symbol);
          toast.info(`Shift margin: ${dragRef.current.fromSymbol} → ${target.symbol}`, {
            description: "Signing required to execute margin transfer",
          });
        }
      }
      dragRef.current = { dragging: false, fromSymbol: null, startX: 0, startY: 0, currentX: 0, currentY: 0 };
      setDragState({ active: false, fromSymbol: null, nearTarget: null });
      canvas.style.cursor = "crosshair";
    };

    const handleClick = (e: MouseEvent) => {
      if (dragRef.current.dragging) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const hit = findHitPosition(mx, my, w / 2, h / 2, timeRef.current);
      if (hit) onPositionSelect(hit.symbol);
    };

    canvas.addEventListener("mousemove", handleMouse);
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("mouseleave", handleMouseUp);
    canvas.addEventListener("click", handleClick);

    const draw = (time: number) => {
      timeRef.current = time;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const cx = w / 2;
      const cy = h / 2;

      ctx.clearRect(0, 0, w, h);

      // Orbital rings
      positionData.forEach(pd => {
        ctx.beginPath();
        ctx.ellipse(cx, cy, pd.orbitRadius, pd.orbitRadius * 0.6, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(220, 10%, 15%, 0.4)`;
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Center core
      const coreSize = 35;
      ctx.beginPath();
      ctx.arc(cx, cy, coreSize, 0, Math.PI * 2);
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreSize);
      coreGrad.addColorStop(0, "hsla(155, 100%, 50%, 0.15)");
      coreGrad.addColorStop(1, "hsla(155, 100%, 50%, 0.02)");
      ctx.fillStyle = coreGrad;
      ctx.fill();
      ctx.strokeStyle = "hsla(155, 100%, 50%, 0.3)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Pulse ring
      const pulseRadius = coreSize + Math.sin(time * 0.002) * 8 + 10;
      ctx.beginPath();
      ctx.arc(cx, cy, pulseRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(155, 100%, 50%, ${0.1 + Math.sin(time * 0.002) * 0.05})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // ── Trade particles ──
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.98;
        p.vy *= 0.98;
        p.alpha = Math.max(0, 1 - p.life / p.maxLife);

        if (p.life >= p.maxLife) {
          particles.splice(i, 1);
          continue;
        }

        const fade = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * fade, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.color}, ${fade * 0.8})`;
        ctx.fill();

        // Glow
        if (p.size > 2) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2.5 * fade, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${p.color}, ${fade * 0.1})`;
          ctx.fill();
        }
      }

      // Draw drag line
      const drag = dragRef.current;
      if (drag.dragging && drag.fromSymbol) {
        const fromPd = positionData.find(p => p.symbol === drag.fromSymbol);
        if (fromPd) {
          const { x: fromX, y: fromY } = getPositionXY(fromPd, time, cx, cy);
          ctx.beginPath();
          ctx.moveTo(fromX, fromY);
          ctx.lineTo(drag.currentX, drag.currentY);
          ctx.strokeStyle = "hsla(155, 100%, 50%, 0.4)";
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          ctx.stroke();
          ctx.setLineDash([]);

          const dx = drag.currentX - fromX;
          const dy = drag.currentY - fromY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const trailCount = Math.floor(dist / 20);
          for (let i = 0; i < trailCount; i++) {
            const t = i / trailCount;
            const px = fromX + dx * t;
            const py = fromY + dy * t;
            const pSize = 2 + Math.sin(time * 0.01 + i) * 1;
            ctx.beginPath();
            ctx.arc(px, py, pSize, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(155, 100%, 50%, ${0.2 + t * 0.3})`;
            ctx.fill();
          }
        }
      }

      // Orbiting bodies
      positionData.forEach(pd => {
        const { x, y } = getPositionXY(pd, time, cx, cy);

        const mx = mouseRef.current.x;
        const my = mouseRef.current.y;
        const distToMouse = Math.sqrt((mx - x) ** 2 + (my - y) ** 2);
        const magnetStrength = Math.max(0, 1 - distToMouse / 100) * 8;
        const magX = magnetStrength > 0 ? (mx - x) / distToMouse * magnetStrength : 0;
        const magY = magnetStrength > 0 ? (my - y) / distToMouse * magnetStrength : 0;

        const fx = x + (drag.dragging && drag.fromSymbol === pd.symbol ? 0 : magX);
        const fy = y + (drag.dragging && drag.fromSymbol === pd.symbol ? 0 : magY);

        const isSelected = selectedSymbol === pd.symbol;
        const isHovered = distToMouse < pd.size + 10;
        const isDragSource = drag.dragging && drag.fromSymbol === pd.symbol;
        const isDragTarget = dragState.nearTarget === pd.symbol;

        // Drag target highlight
        if (isDragTarget) {
          ctx.beginPath();
          ctx.arc(fx, fy, pd.size * 3, 0, Math.PI * 2);
          const targetGlow = ctx.createRadialGradient(fx, fy, pd.size, fx, fy, pd.size * 3);
          targetGlow.addColorStop(0, "hsla(155, 100%, 50%, 0.2)");
          targetGlow.addColorStop(1, "transparent");
          ctx.fillStyle = targetGlow;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(fx, fy, pd.size + 6, 0, Math.PI * 2);
          ctx.strokeStyle = "hsla(155, 100%, 50%, 0.6)";
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        if ((isSelected || isHovered) && !isDragSource) {
          const glowGrad = ctx.createRadialGradient(fx, fy, 0, fx, fy, pd.size * 2.5);
          glowGrad.addColorStop(0, pd.pnl >= 0 ? "hsla(155, 100%, 50%, 0.15)" : "hsla(0, 85%, 55%, 0.15)");
          glowGrad.addColorStop(1, "transparent");
          ctx.beginPath();
          ctx.arc(fx, fy, pd.size * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = glowGrad;
          ctx.fill();
        }

        const morphOffset = Math.sin(time * 0.003 + pd.angle) * 2;
        const sizeMultiplier = isDragSource ? 0.85 : isDragTarget ? 1.15 : 1;
        const bodySize = pd.size * sizeMultiplier;

        ctx.beginPath();
        ctx.ellipse(fx, fy, bodySize + morphOffset, bodySize - morphOffset, time * 0.001, 0, Math.PI * 2);
        const bodyGrad = ctx.createRadialGradient(fx, fy, 0, fx, fy, bodySize);
        bodyGrad.addColorStop(0, isDragSource ? "hsla(155, 100%, 50%, 0.6)" : pd.color);
        bodyGrad.addColorStop(0.6, pd.dimColor);
        bodyGrad.addColorStop(1, "transparent");
        ctx.fillStyle = bodyGrad;
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(fx, fy, bodySize + morphOffset, bodySize - morphOffset, time * 0.001, 0, Math.PI * 2);
        ctx.strokeStyle = isSelected || isDragTarget ? pd.color : `${pd.color}66`;
        ctx.lineWidth = isSelected || isDragTarget ? 2 : 1;
        ctx.stroke();

        ctx.font = `600 ${isHovered ? 13 : 11}px "JetBrains Mono", monospace`;
        ctx.fillStyle = isHovered || isDragTarget ? "hsl(200, 10%, 95%)" : "hsl(200, 10%, 70%)";
        ctx.textAlign = "center";
        ctx.fillText(pd.symbol, fx, fy - bodySize - 8);

        if (isHovered && !drag.dragging) {
          ctx.font = `400 9px "Space Grotesk", sans-serif`;
          ctx.fillStyle = pd.pnl >= 0 ? "hsl(155, 100%, 50%)" : "hsl(0, 85%, 55%)";
          ctx.fillText(
            `${pd.side === "bid" ? "LONG" : "SHORT"} · $${Math.abs(pd.pnl).toFixed(0)}`,
            fx, fy + bodySize + 16
          );
          ctx.font = `300 7px "Space Grotesk", sans-serif`;
          ctx.fillStyle = "hsl(200, 8%, 45%)";
          ctx.fillText("drag to shift margin", fx, fy + bodySize + 28);
        }

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(fx, fy);
        ctx.strokeStyle = `${pd.dimColor}33`;
        ctx.lineWidth = isDragSource ? 1.5 : 0.5;
        ctx.stroke();
      });

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", handleMouse);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("mouseleave", handleMouseUp);
      canvas.removeEventListener("click", handleClick);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [positionData, selectedSymbol, onPositionSelect, dragState.nearTarget, getPositionXY, findHitPosition, onMarginShift]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full cursor-crosshair"
      style={{ touchAction: "none" }}
    />
  );
}
