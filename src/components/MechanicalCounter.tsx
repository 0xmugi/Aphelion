import { useEffect, useRef, useState } from "react";

interface Props {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function MechanicalCounter({ value, decimals = 2, prefix = "", suffix = "", className = "" }: Props) {
  const [displayValue, setDisplayValue] = useState(value);
  const animRef = useRef<number>();
  const prevValue = useRef(value);

  useEffect(() => {
    const start = prevValue.current;
    const end = value;
    const duration = 800;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Elastic ease-out
      const eased = 1 - Math.pow(1 - progress, 3) * Math.cos(progress * Math.PI * 0.5);
      setDisplayValue(start + (end - start) * eased);
      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        prevValue.current = end;
      }
    };

    animRef.current = requestAnimationFrame(animate);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [value]);

  const formatted = displayValue.toFixed(decimals);
  const [intPart, decPart] = formatted.split(".");

  return (
    <span className={`font-mono-system inline-flex items-baseline ${className}`}>
      {prefix && <span className="text-muted-foreground mr-0.5">{prefix}</span>}
      <span className="relative">
        {intPart.split("").map((char, i) => (
          <span key={i} className="inline-block" style={{ 
            transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}>
            {char}
          </span>
        ))}
      </span>
      {decPart && (
        <>
          <span className="text-muted-foreground">.</span>
          <span className="text-muted-foreground text-[0.75em]">{decPart}</span>
        </>
      )}
      {suffix && <span className="text-muted-foreground ml-1 text-[0.65em] font-grotesk">{suffix}</span>}
    </span>
  );
}
