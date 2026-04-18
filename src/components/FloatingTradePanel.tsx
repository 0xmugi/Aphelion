import { useState, useEffect, useRef, type ReactNode } from "react";
import { Minus, Maximize2 } from "lucide-react";

interface Props {
  children: ReactNode;
}

/**
 * Wraps the TradePanel so users can click anywhere inside the compact card
 * to expand it into a centered modal. A minimize button in the top-right
 * collapses it back to its original docked position.
 */
export function FloatingTradePanel({ children }: Props) {
  const [expanded, setExpanded] = useState(false);
  const dockedRef = useRef<HTMLDivElement>(null);
  const interactiveSelector = "button, input, select, textarea, [role='button'], [data-no-expand]";

  // Lock body scroll while modal is open
  useEffect(() => {
    if (expanded) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [expanded]);

  // Esc to minimize
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setExpanded(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  const handleDockedClick = (e: React.MouseEvent) => {
    if (expanded) return;
    // Don't expand when clicking on form controls
    if ((e.target as HTMLElement).closest(interactiveSelector)) return;
    setExpanded(true);
  };

  return (
    <>
      {/* Docked compact card — visually present even when modal is open (placeholder) */}
      <div
        ref={dockedRef}
        onClick={handleDockedClick}
        className={`
          relative group cursor-pointer
          transition-opacity duration-200
          ${expanded ? "opacity-30 pointer-events-none" : "opacity-100"}
        `}
      >
        {/* Hover hint */}
        {!expanded && (
          <div className="absolute -top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-foreground/90 text-background rounded-sm text-[0.45rem] font-mono-system tracking-wider">
              <Maximize2 className="w-2 h-2" />
              EXPAND
            </div>
          </div>
        )}
        <div className="pointer-events-auto">{children}</div>
      </div>

      {/* Expanded modal */}
      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) setExpanded(false); }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-background/70 backdrop-blur-md" />

          {/* Modal content */}
          <div
            className="relative w-full max-w-md max-h-[90vh] overflow-y-auto animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
            style={{ transformOrigin: "bottom right" }}
          >
            {/* Minimize button */}
            <button
              onClick={() => setExpanded(false)}
              className="absolute top-2 right-2 z-20 w-7 h-7 flex items-center justify-center rounded-sm bg-secondary/80 hover:bg-secondary border border-border/40 hover:border-border/60 text-muted-foreground hover:text-foreground transition-all duration-200 backdrop-blur-sm"
              aria-label="Minimize trade panel"
              title="Minimize (Esc)"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            {/* Scaled-up trade panel */}
            <div className="text-[1.15rem] [&_.text-\[0\.55rem\]]:text-[0.7rem] [&_.text-\[0\.6rem\]]:text-[0.75rem] [&_.text-\[0\.65rem\]]:text-[0.8rem] [&_.text-\[0\.7rem\]]:text-[0.875rem] [&_.text-\[0\.5rem\]]:text-[0.65rem] [&_.text-\[0\.45rem\]]:text-[0.6rem] [&_.text-\[0\.42rem\]]:text-[0.55rem] [&_.text-\[0\.4rem\]]:text-[0.55rem] [&_.p-3]:p-5 [&_.py-1]:py-2 [&_.py-1\.5]:py-2.5 [&_.py-2]:py-3">
              {children}
            </div>
          </div>
        </div>
      )}
    </>
  );
}