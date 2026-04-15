import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEffect, useRef, useState } from "react";

/* ── Intersection Observer hook ── */
function useScrollReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.unobserve(el); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

/* ── Parallax hook ── */
function useParallax() {
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => { setScrollY(window.scrollY); ticking = false; });
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return scrollY;
}

/* ── Minimal SVG icons (no emoji) ── */
const FeatureIcon = ({ type }: { type: string }) => {
  const cls = "w-5 h-5 text-energy-green";
  switch (type) {
    case "orbit":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="3" />
          <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-30 12 12)" />
          <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(30 12 12)" />
        </svg>
      );
    case "execute":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      );
    case "analytics":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 3v18h18" />
          <path d="M7 16l4-6 4 3 5-7" />
        </svg>
      );
    case "alerts":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      );
    case "websocket":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M4 12h2m12 0h2" />
          <circle cx="12" cy="12" r="3" />
          <path d="M8.5 8.5L6 6m10 10l2.5 2.5M15.5 8.5L18 6M6 18l2.5-2.5" />
          <circle cx="12" cy="12" r="9" strokeDasharray="4 3" />
        </svg>
      );
    case "wallet":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="2" y="6" width="20" height="14" rx="2" />
          <path d="M2 10h20" />
          <circle cx="17" cy="14" r="1.5" fill="currentColor" />
        </svg>
      );
    default:
      return <div className="w-5 h-5 rounded-full bg-energy-green/20" />;
  }
};

const Landing = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const scrollY = useParallax();

  const features = useScrollReveal(0.1);
  const guide = useScrollReveal(0.1);
  const techStack = useScrollReveal(0.1);
  const cta = useScrollReveal(0.2);

  const [heroLoaded, setHeroLoaded] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setHeroLoaded(true), 100);
    return () => clearTimeout(t);
  }, []);

  /* ── Launch with transition ── */
  const handleLaunch = () => {
    setIsExiting(true);
    setTimeout(() => navigate("/dashboard"), 600);
  };

  return (
    <div
      className="min-h-screen bg-background text-foreground overflow-x-hidden transition-all duration-600"
      style={{
        opacity: isExiting ? 0 : 1,
        transform: isExiting ? "scale(1.02)" : "scale(1)",
        filter: isExiting ? "blur(8px)" : "blur(0px)",
        transition: "opacity 0.6s, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), filter 0.6s",
      }}
    >
      {/* Nav */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-4 border-b border-border/20 transition-all duration-500"
        style={{
          backgroundColor: scrollY > 50 ? "hsl(220 15% 5% / 0.95)" : "hsl(220 15% 5% / 0.6)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-energy-green animate-pulse-ring" />
          <span className="font-heading text-sm tracking-[0.2em] uppercase text-foreground">Aphelion</span>
        </div>
        <button
          onClick={handleLaunch}
          className="text-xs font-mono px-4 py-2 border border-energy-green/30 text-energy-green rounded-sm hover:bg-energy-green/10 transition-colors"
        >
          Launch App
        </button>
      </nav>

      {/* Hero */}
      <section className="min-h-screen flex flex-col md:flex-row items-center pt-16 relative overflow-hidden">
        <div className="flex-1 flex flex-col justify-center px-6 md:px-16 lg:px-24 py-16 md:py-0">
          {[
            {
              delay: "0.1s",
              content: (
                <div className="text-[0.6rem] font-mono text-energy-green/60 tracking-[0.4em] uppercase mb-4">
                  Powered by Pacifica API & WebSocket
                </div>
              ),
            },
            {
              delay: "0.25s",
              content: (
                <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] mb-6">
                  Margin<br />
                  <span className="text-energy-green">Intelligence</span><br />
                  Redefined
                </h1>
              ),
            },
            {
              delay: "0.4s",
              content: (
                <p className="font-body text-muted-foreground text-sm md:text-base max-w-md mb-8 leading-relaxed">
                  Real-time perpetual futures management with orbital portfolio visualization.
                  Connected directly to Pacifica's on-chain infrastructure — live prices, orderbook depth,
                  funding rates, and instant execution.
                </p>
              ),
            },
            {
              delay: "0.55s",
              content: (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleLaunch}
                    className="elastic-hover px-6 py-3 bg-energy-green text-primary-foreground font-heading text-sm font-semibold rounded-sm hover:brightness-110 transition-all"
                  >
                    Open Dashboard
                  </button>
                  <button
                    onClick={() => {
                      const el = document.getElementById("guide");
                      if (el) {
                        el.scrollIntoView({ behavior: "smooth", block: "start" });
                      }
                    }}
                    className="elastic-hover px-6 py-3 border border-border/50 text-muted-foreground font-body text-sm rounded-sm hover:border-energy-green/30 hover:text-foreground transition-colors"
                  >
                    Learn More
                  </button>
                </div>
              ),
            },
            {
              delay: "0.7s",
              content: (
                <div className="flex items-center gap-6 mt-10 text-[0.6rem] font-mono text-muted-foreground/60">
                  <span>REST + WebSocket</span>
                  <span className="w-px h-3 bg-border/30" />
                  <span>Solana Wallets</span>
                  <span className="w-px h-3 bg-border/30" />
                  <span>On-chain Execution</span>
                </div>
              ),
            },
          ].map((item, i) => (
            <div
              key={i}
              className="transition-all duration-700 ease-out"
              style={{
                opacity: heroLoaded ? 1 : 0,
                transform: heroLoaded ? "translateY(0)" : "translateY(24px)",
                transitionDelay: item.delay,
              }}
            >
              {item.content}
            </div>
          ))}
        </div>

        {/* Right: Orbital visual with parallax */}
        <div
          className="flex-1 flex items-center justify-center relative py-16 md:py-0 min-h-[400px]"
          style={{ transform: `translateY(${scrollY * -0.12}px)` }}
        >
          <div
            className="absolute w-[500px] h-[500px] rounded-full transition-opacity duration-1000"
            style={{
              background: "radial-gradient(circle, hsl(155, 100%, 50%) 0%, transparent 70%)",
              opacity: heroLoaded ? 0.06 : 0,
              transform: `translate(${scrollY * 0.03}px, ${scrollY * -0.05}px)`,
            }}
          />
          <div
            className="relative w-64 h-64 md:w-80 md:h-80 transition-all duration-1000 ease-out"
            style={{
              opacity: heroLoaded ? 1 : 0,
              transform: heroLoaded ? "scale(1) rotate(0deg)" : "scale(0.7) rotate(-30deg)",
              transitionDelay: "0.3s",
            }}
          >
            {[1, 2, 3].map((ring) => (
              <div
                key={ring}
                className="absolute inset-0 rounded-full border border-energy-green/10"
                style={{
                  transform: `scale(${0.4 + ring * 0.25})`,
                  animation: `orbit ${15 + ring * 5}s linear infinite`,
                }}
              />
            ))}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 md:w-20 md:h-20 rounded-full bg-energy-green/10 border border-energy-green/20 flex items-center justify-center animate-morph">
              <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-energy-green/40 animate-pulse-ring" />
            </div>
            {[
              { angle: 45, dist: 90, color: "bg-energy-green", size: "w-3 h-3" },
              { angle: 150, dist: 110, color: "bg-risk-red", size: "w-2.5 h-2.5" },
              { angle: 250, dist: 130, color: "bg-energy-green", size: "w-4 h-4" },
              { angle: 320, dist: 75, color: "bg-idle-amber", size: "w-2 h-2" },
            ].map((node, i) => {
              const x = Math.cos((node.angle * Math.PI) / 180) * node.dist;
              const y = Math.sin((node.angle * Math.PI) / 180) * node.dist;
              return (
                <div
                  key={i}
                  className={`absolute rounded-full ${node.color}/60 ${node.size} animate-float`}
                  style={{
                    left: `calc(50% + ${x}px)`,
                    top: `calc(50% + ${y}px)`,
                    animationDelay: `${i * 0.8}s`,
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Scroll indicator */}
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 transition-opacity duration-500"
          style={{ opacity: scrollY > 100 ? 0 : 0.4 }}
        >
          <span className="text-[0.5rem] font-mono text-muted-foreground tracking-widest uppercase">Scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-muted-foreground/40 to-transparent animate-pulse" />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6 md:px-16 lg:px-24 scroll-mt-16" ref={features.ref}>
        <div
          className="transition-all duration-700 ease-out"
          style={{
            opacity: features.visible ? 1 : 0,
            transform: features.visible ? "translateY(0)" : "translateY(40px)",
          }}
        >
          <div className="text-[0.6rem] font-mono text-energy-green/60 tracking-[0.4em] uppercase mb-3">
            Core Features
          </div>
          <h2 className="font-heading text-2xl md:text-3xl font-bold mb-16">
            Everything you need for<br />
            <span className="text-energy-green">leveraged trading</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: "orbit", title: "Orbital Portfolio View", desc: "Positions rendered as orbiting nodes. Size = notional value, distance = leverage, color = PnL direction." },
            { icon: "execute", title: "One-Click Execution", desc: "Market and limit orders with leverage slider (1x–50x), TP/SL inputs, and direct on-chain execution via Pacifica." },
            { icon: "analytics", title: "Multi-View Analytics", desc: "Switch between Orbit, Timeline, Funding heatmap, Orderbook depth, and PnL breakdown views." },
            { icon: "alerts", title: "Intelligent Alerts", desc: "Auto-generated risk alerts for high leverage, margin thresholds, and funding rate anomalies." },
            { icon: "websocket", title: "Live WebSocket Feed", desc: "Direct connection to wss://ws.pacifica.fi/ws with 30s heartbeat, auto-reconnect, and REST fallback." },
            { icon: "wallet", title: "Solana Wallet Integration", desc: "Connect Phantom, Solflare, Backpack — or explore in full demo mode without a wallet." },
          ].map((feature, i) => (
            <div
              key={i}
              className="group p-6 border border-border/20 rounded-sm hover:border-energy-green/20 hover:bg-energy-green/[0.02] transition-all duration-500"
              style={{
                opacity: features.visible ? 1 : 0,
                transform: features.visible ? "translateY(0) scale(1)" : "translateY(30px) scale(0.97)",
                transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
                transitionDelay: features.visible ? `${0.1 + i * 0.1}s` : "0s",
              }}
            >
              <div className="w-10 h-10 rounded-sm border border-energy-green/20 bg-energy-green/5 flex items-center justify-center mb-4 group-hover:border-energy-green/40 group-hover:bg-energy-green/10 transition-colors duration-300">
                <FeatureIcon type={feature.icon} />
              </div>
              <h3 className="font-heading text-sm font-semibold mb-2 group-hover:text-energy-green transition-colors">
                {feature.title}
              </h3>
              <p className="font-body text-xs text-muted-foreground leading-relaxed">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How to Use */}
      <section id="guide" className="py-24 px-6 md:px-16 lg:px-24 border-t border-border/10" ref={guide.ref}>
        <div
          className="transition-all duration-700 ease-out"
          style={{
            opacity: guide.visible ? 1 : 0,
            transform: guide.visible ? "translateY(0)" : "translateY(40px)",
          }}
        >
          <div className="text-[0.6rem] font-mono text-energy-green/60 tracking-[0.4em] uppercase mb-3">
            Getting Started
          </div>
          <h2 className="font-heading text-2xl md:text-3xl font-bold mb-4">
            How to use <span className="text-energy-green">Aphelion</span>
          </h2>
          <p className="font-body text-muted-foreground text-sm max-w-2xl mb-12 leading-relaxed">
            Aphelion is a trading interface — not a custodial platform. All funds are managed through Pacifica's on-chain infrastructure. Here's how to get started.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl">
          {[
            {
              step: "01",
              title: "Deposit on Pacifica",
              desc: "Go to app.pacifica.fi, connect your Solana wallet, and deposit USDC. Aphelion does not handle deposits — your funds live on Pacifica's smart contracts.",
              action: {
                label: "Open Pacifica",
                url: "https://app.pacifica.fi/",
              },
            },
            {
              step: "02",
              title: "Launch Aphelion",
              desc: "Come back here and open the dashboard. Connect the same wallet you used on Pacifica. Aphelion reads your positions, balances, and orders in real-time.",
              action: null,
            },
            {
              step: "03",
              title: "Trade & Monitor",
              desc: "Place market or limit orders with up to 50x leverage. Monitor positions in the orbital view, track funding rates, and manage risk — all from one screen.",
              action: null,
            },
          ].map((item, i) => (
            <div
              key={i}
              className="relative p-6 border border-border/20 rounded-sm"
              style={{
                opacity: guide.visible ? 1 : 0,
                transform: guide.visible ? "translateY(0)" : "translateY(24px)",
                transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
                transitionDelay: guide.visible ? `${0.15 + i * 0.12}s` : "0s",
              }}
            >
              <div className="text-[2rem] font-heading font-bold text-energy-green/10 absolute top-4 right-4 leading-none">
                {item.step}
              </div>
              <h3 className="font-heading text-sm font-semibold mb-3">{item.title}</h3>
              <p className="font-body text-xs text-muted-foreground leading-relaxed mb-4">
                {item.desc}
              </p>
              {item.action && (
                <a
                  href={item.action.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[0.65rem] font-mono text-energy-green hover:text-energy-green/80 transition-colors"
                >
                  {item.action.label}
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M7 17L17 7M17 7H7M17 7v10" />
                  </svg>
                </a>
              )}
            </div>
          ))}
        </div>

        <div
          className="mt-12 p-5 border border-border/10 rounded-sm max-w-4xl"
          style={{
            opacity: guide.visible ? 1 : 0,
            transform: guide.visible ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
            transitionDelay: guide.visible ? "0.5s" : "0s",
          }}
        >
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 mt-0.5 shrink-0 rounded-full border border-energy-green/30 flex items-center justify-center">
              <svg className="w-3 h-3 text-energy-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 16v-4M12 8h.01" />
              </svg>
            </div>
            <div>
              <p className="font-body text-xs text-muted-foreground leading-relaxed">
                <span className="text-foreground/80 font-medium">No wallet needed to explore.</span>{" "}
                Aphelion runs in full demo mode with simulated positions and live market data. Connect a wallet only when you're ready to trade with real funds.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tech stack */}
      <section className="py-24 px-6 md:px-16 lg:px-24 border-t border-border/20" ref={techStack.ref}>
        <div
          className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8"
          style={{
            opacity: techStack.visible ? 1 : 0,
            transform: techStack.visible ? "translateY(0)" : "translateY(40px)",
            transition: "all 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <div>
            <div className="text-[0.6rem] font-mono text-energy-green/60 tracking-[0.4em] uppercase mb-3">
              Architecture
            </div>
            <h2 className="font-heading text-2xl md:text-3xl font-bold">
              Built on <span className="text-energy-green">Pacifica Protocol</span>
            </h2>
            <p className="font-body text-muted-foreground text-sm mt-3 max-w-lg">
              Direct integration with Pacifica's REST API and WebSocket protocol.
              No third-party data providers, no delays — pure on-chain data.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs font-mono">
            {[
              ["Frontend", "React 18 + Vite 5"],
              ["Styling", "Tailwind CSS v3"],
              ["Data", "Pacifica REST + WS"],
              ["Wallet", "Solana Adapter"],
              ["Charts", "Recharts + SVG"],
              ["State", "TanStack Query"],
            ].map(([label, tech], i) => (
              <div
                key={label}
                className="px-4 py-3 border border-border/20 rounded-sm hover:border-energy-green/20 transition-colors duration-300"
                style={{
                  opacity: techStack.visible ? 1 : 0,
                  transform: techStack.visible ? "translateX(0)" : "translateX(20px)",
                  transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
                  transitionDelay: techStack.visible ? `${0.2 + i * 0.08}s` : "0s",
                }}
              >
                <div className="text-muted-foreground/50 text-[0.55rem] mb-1">{label}</div>
                <div className="text-foreground/80">{tech}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 md:px-16 lg:px-24 border-t border-border/20 text-center" ref={cta.ref}>
        <div
          style={{
            opacity: cta.visible ? 1 : 0,
            transform: cta.visible ? "translateY(0) scale(1)" : "translateY(30px) scale(0.95)",
            transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
            Ready to <span className="text-energy-green">trade smarter</span>?
          </h2>
          <p className="font-body text-muted-foreground text-sm mb-8 max-w-md mx-auto">
            Connect your wallet and experience margin intelligence in real-time.
            Or explore with full demo mode — no wallet required.
          </p>
          <button
            onClick={handleLaunch}
            className="elastic-hover px-8 py-4 bg-energy-green text-primary-foreground font-heading text-sm font-semibold rounded-sm hover:brightness-110 transition-all"
          >
            Launch Aphelion
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 md:px-16 border-t border-border/20 flex items-center justify-between text-[0.5rem] font-mono text-muted-foreground/40">
        <span>APHELION MARGIN INTELLIGENCE v1.0</span>
        <span>Powered by Pacifica Protocol</span>
      </footer>
    </div>
  );
};

export default Landing;
