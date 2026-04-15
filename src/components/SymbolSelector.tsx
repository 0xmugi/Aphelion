import { useState, useMemo, useRef, useEffect } from "react";

interface SymbolPrice {
  symbol: string;
  mark: string;
  change24h?: number; // percent
}

interface Props {
  value: string;
  symbols: SymbolPrice[];
  onChange: (symbol: string) => void;
}

export function SymbolSelector({ value, symbols, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = useMemo(() => {
    if (!search) return symbols;
    const q = search.toUpperCase();
    return symbols.filter(s => s.symbol.includes(q));
  }, [symbols, search]);

  const current = symbols.find(s => s.symbol === value);

  const formatPrice = (mark: string) => {
    const n = parseFloat(mark);
    if (n >= 10000) return n.toFixed(0);
    if (n >= 100) return n.toFixed(2);
    if (n >= 1) return n.toFixed(3);
    if (n >= 0.01) return n.toFixed(4);
    return n.toFixed(6);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(!open); setSearch(""); }}
        className="flex items-center gap-1.5 bg-background border border-border/40 rounded-sm px-2 py-1 text-[0.6rem] font-mono-system text-foreground font-semibold hover:border-border/60 focus:border-energy-green/40 focus:outline-none transition-colors"
      >
        <span>{value}</span>
        {current && (
          <span className="text-muted-foreground font-normal">${formatPrice(current.mark)}</span>
        )}
        <svg width="8" height="5" viewBox="0 0 8 5" fill="none" className={`transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M1 1L4 4L7 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-background border border-border/40 rounded-sm shadow-lg z-50 overflow-hidden">
          <div className="p-1.5 border-b border-border/20">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search symbol..."
              className="w-full bg-secondary/50 border border-border/30 rounded-sm px-2 py-1 text-[0.6rem] font-mono-system text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-energy-green/30"
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="px-3 py-4 text-[0.55rem] text-muted-foreground text-center">No symbols found</div>
            )}
            {filtered.map(s => (
              <button
                key={s.symbol}
                onClick={() => { onChange(s.symbol); setOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-1.5 text-[0.6rem] font-mono-system hover:bg-secondary/50 transition-colors ${
                  s.symbol === value ? "bg-secondary/30 text-foreground" : "text-muted-foreground"
                }`}
              >
                <span className="font-semibold text-foreground">{s.symbol}</span>
                <span className="tabular-nums">${formatPrice(s.mark)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
