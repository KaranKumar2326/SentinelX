import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

const logos = [
  { n: "OpenMetadata", c: "#0284c7" },
  { n: "Apache Airflow", c: "#017cee" },
  { n: "Astronomer", c: "#0369a1" },
  { n: "Groq", c: "#f43f5e" },
  { n: "dbt", c: "#ff6b35" },
  { n: "Snowflake", c: "#29b5e8" },
  { n: "BigQuery", c: "#4285f4" },
  { n: "Databricks", c: "#ff3621" },
  { n: "Kafka", c: "#000000" },
  { n: "PostgreSQL", c: "#336791" },
  { n: "Great Expectations", c: "#2da44e" },
  { n: "Monte Carlo", c: "#6366f1" },
];

const features = [
  {
    icon: "🔬",
    title: "Live Observability",
    desc: "Native OpenMetadata integration monitors data quality, schema changes, and freshness thresholds in real-time across all pipelines.",
  },
  {
    icon: "⚡",
    title: "AI Root Cause Analysis",
    desc: "Groq-accelerated LLMs trace the incident back to source within seconds — with full lineage context and blast-radius assessment.",
  },
  {
    icon: "🔄",
    title: "Self-Healing Pipelines",
    desc: "Triggers Airflow remediation DAGs instantly. Broken datasets are fixed autonomously before stakeholders ever notice.",
  },
  {
    icon: "📊",
    title: "Lineage Graph",
    desc: "Visual, interactive data lineage across your entire warehouse. See exactly what broke and everything downstream it affects.",
  },
  {
    icon: "🔔",
    title: "Smart Alerting",
    desc: "Context-aware notifications that only fire when they matter. Route to Slack, PagerDuty, or your own webhook — zero noise.",
  },
  {
    icon: "📋",
    title: "Incident Timeline",
    desc: "Every incident logged, explained, and resolved with a full audit trail. Retrospectives write themselves.",
  },
];

const steps = [
  {
    icon: "👁",
    num: "01 — Detect",
    title: "Signal Ingestion",
    desc: "OpenMetadata streams quality signals, schema events, and freshness checks into the engine continuously.",
  },
  {
    icon: "🧠",
    num: "02 — Analyze",
    title: "AI Triage",
    desc: "LLM classifies the incident, traces lineage, and calculates the full blast radius.",
  },
  {
    icon: "🗺",
    num: "03 — Plan",
    title: "Remediation Design",
    desc: "SentinelX generates a precise fix — DAG patch, backfill window, or schema migration strategy.",
  },
  {
    icon: "✅",
    num: "04 — Heal",
    title: "Auto-Execution",
    desc: "Airflow runs the fix autonomously. Status surfaces live in your dashboard.",
  },
];

function useCounter(target: number, active: boolean, duration = 1600) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(eased * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [active, target, duration]);
  return value;
}

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d")!;
    let animId: number;
    let mx = 0, my = 0;
    let t = 0;

    const resize = () => {
      const parent = cvs.parentElement!;
      cvs.width = parent.offsetWidth * devicePixelRatio;
      cvs.height = parent.offsetHeight * devicePixelRatio;
      cvs.style.width = parent.offsetWidth + "px";
      cvs.style.height = parent.offsetHeight + "px";
      ctx.scale(devicePixelRatio, devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);

    const onMove = (e: MouseEvent) => { mx = e.clientX; my = e.clientY; };
    document.addEventListener("mousemove", onMove);

    const orbConfigs = [
      { ox: 0.15, oy: 0.3, r: 180, color: "rgba(79,70,229,0.10)", phase: 0 },
      { ox: 0.33, oy: 0.6, r: 160, color: "rgba(99,91,255,0.08)", phase: 1.3 },
      { ox: 0.55, oy: 0.2, r: 200, color: "rgba(139,92,246,0.07)", phase: 2.6 },
      { ox: 0.72, oy: 0.7, r: 140, color: "rgba(79,70,229,0.06)", phase: 0.8 },
      { ox: 0.88, oy: 0.4, r: 170, color: "rgba(167,139,250,0.07)", phase: 2.1 },
    ];

    const draw = () => {
      const w = cvs.parentElement!.offsetWidth;
      const h = cvs.parentElement!.offsetHeight;
      ctx.clearRect(0, 0, w, h);
      orbConfigs.forEach((o) => {
        const x = w * o.ox + Math.sin(t * 0.4 + o.phase) * 30 + (mx / w - 0.5) * 18;
        const y = h * o.oy + Math.cos(t * 0.3 + o.phase) * 20 + (my / h - 0.5) * 12;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, o.r);
        grad.addColorStop(0, o.color);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, o.r, 0, Math.PI * 2);
        ctx.fill();
      });
      t += 0.016;
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      document.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute", inset: 0, width: "100%", height: "100%",
        pointerEvents: "none", opacity: 0.55,
      }}
    />
  );
}

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 48px", height: 62,
      background: "rgba(250,250,250,0.88)",
      backdropFilter: "blur(16px)",
      borderBottom: "1px solid #e8e8ee",
      boxShadow: scrolled ? "0 1px 24px rgba(0,0,0,0.06)" : "none",
      transition: "box-shadow .3s",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, fontWeight: 600, fontSize: 15, letterSpacing: "-.02em" }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8, background: "#0d0d12",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z" stroke="#fff" strokeWidth="1.2" fill="none" />
            <circle cx="8" cy="8" r="2.5" fill="#fff" />
          </svg>
        </div>
        SentinelX
      </div>
      <div style={{ display: "flex", gap: 28 }}>
        {["Features", "How it works", "Integrations", "Docs"].map((l) => (
          <a key={l} href={`#${l.toLowerCase().replace(/ /g, "-")}`}
            style={{ fontSize: 13.5, color: "#767688", fontWeight: 400, textDecoration: "none", letterSpacing: "-.01em" }}>
            {l}
          </a>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <Link to="/login" style={{
          padding: "7px 16px", border: "1px solid #d0d0dc", borderRadius: 8,
          fontSize: 13, fontWeight: 500, color: "#3a3a4a", background: "#fff",
          cursor: "pointer", fontFamily: "inherit",
          display: 'flex', alignItems: 'center'
        }}>Sign in</Link>
        <Link to="/register" style={{
          padding: "7px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600,
          color: "#fff", background: "#0369a1", border: "none",
          cursor: "pointer", fontFamily: "inherit",
          display: 'flex', alignItems: 'center'
        }}>Get started</Link>
      </div>
    </nav>
  );
}

function HeroDashCard() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setProgress(72), 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      background: "#fff", border: "1px solid #e8e8ee", borderRadius: 20, overflow: "hidden",
      boxShadow: "0 4px 48px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)",
    }}>
      <div style={{ padding: "14px 16px", borderBottom: "1px solid #e8e8ee", display: "flex", alignItems: "center", gap: 8 }}>
        {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
          <div key={c} style={{ width: 9, height: 9, borderRadius: "50%", background: c }} />
        ))}
        <span style={{ marginLeft: 4, fontSize: 12, color: "#a8a8b8" }}>sentinel · monitoring</span>
      </div>
      <div style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".07em", textTransform: "uppercase", color: "#767688" }}>Pipeline Health</span>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 100, background: "#dcfce7", color: "#15803d" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", animation: "pulse-g 2s infinite" }} />
            Live
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {[
            { icon: "🟢", name: "orders_etl", time: "2m ago", badge: "Healthy", bg: "#f0fdf4", tc: "#166534", bc: "#f0fdf4" },
            { icon: "🟡", name: "revenue_mart", time: "7m ago", badge: "Degraded", bg: "#fffbeb", tc: "#92400e", bc: "#fffbeb" },
            { icon: "🟢", name: "user_segments", time: "1m ago", badge: "Healthy", bg: "#f0fdf4", tc: "#166534", bc: "#f0fdf4" },
          ].map((row) => (
            <div key={row.name} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", borderRadius: 10, background: "#fafafa", border: "1px solid #e8e8ee",
            }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, background: row.bg, flexShrink: 0 }}>{row.icon}</div>
              <span style={{ fontSize: 12.5, fontWeight: 500, flex: 1, letterSpacing: "-.01em" }}>{row.name}</span>
              <span style={{ fontSize: 11, color: "#a8a8b8" }}>{row.time}</span>
              <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 100, background: row.bc, color: row.tc }}>{row.badge}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: 12, borderRadius: 10, background: "linear-gradient(135deg,#fffbeb,#fef9ee)", border: "1px solid #fed7aa" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#92400e", letterSpacing: ".04em", textTransform: "uppercase" }}>⚠ Active Incident</span>
            <span style={{ fontSize: 10.5, color: "#b45309" }}>09:14:07</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#0d0d12", marginBottom: 4, letterSpacing: "-.01em" }}>Null rate spike in revenue_mart</div>
          <div style={{ fontSize: 11.5, color: "#767688" }}>RCA in progress — upstream: payment_events</div>
          <div style={{ marginTop: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "#767688", marginBottom: 5 }}>
              <span>Auto-remediation</span><span>{progress}%</span>
            </div>
            <div style={{ height: 4, background: "#fed7aa", borderRadius: 100, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 100,
                background: "linear-gradient(90deg,#f59e0b,#f97316)",
                width: `${progress}%`, transition: "width 2.5s cubic-bezier(.4,0,.2,1)",
              }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



function Features() {
  const { ref, visible } = useReveal();
  return (
    <section id="features" style={{ maxWidth: 1160, margin: "0 auto", padding: "100px 48px" }}>
      <div ref={ref} style={{ marginBottom: 64, opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(20px)", transition: "opacity .6s, transform .6s" }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "#0369a1", marginBottom: 14, fontFamily: "'DM Sans', sans-serif" }}>Platform</div>
        <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: "clamp(32px,4vw,52px)", fontWeight: 400, letterSpacing: "-.03em", lineHeight: 1.06, color: "#0d0d12", marginBottom: 14 }}>
          Everything your data<br />team needs.
        </h2>
        <p style={{ fontSize: 16, lineHeight: 1.65, color: "#767688", fontWeight: 300, maxWidth: 500, letterSpacing: "-.01em" }}>
          One engine that replaces five tools. Built for data engineers who want answers, not alerts.
        </p>
      </div>
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3,1fr)",
        gap: 1, background: "#e8e8ee", border: "1px solid #e8e8ee", borderRadius: 16, overflow: "hidden",
        opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(20px)",
        transition: "opacity .6s .1s, transform .6s .1s",
      }}>
        {features.map((f, i) => (
          <FeatureCell key={i} icon={f.icon} title={f.title} desc={f.desc} />
        ))}
      </div>
    </section>
  );
}

function FeatureCell({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "#fafafe" : "#fff", padding: "36px 32px",
        transition: "background .2s", position: "relative", overflow: "hidden",
      }}
    >
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 2,
        background: "linear-gradient(90deg,#0369a1,#c7c3f9)",
        transform: hovered ? "scaleX(1)" : "scaleX(0)", transformOrigin: "left",
        transition: "transform .3s",
      }} />
      <div style={{ width: 40, height: 40, borderRadius: 10, border: "1px solid #e8e8ee", background: "#fafafa", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24, fontSize: 17 }}>{icon}</div>
      <h3 style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-.02em", marginBottom: 10, color: "#0d0d12", fontFamily: "'DM Sans', sans-serif" }}>{title}</h3>
      <p style={{ fontSize: 13.5, lineHeight: 1.65, color: "#767688", fontWeight: 300, fontFamily: "'DM Sans', sans-serif" }}>{desc}</p>
    </div>
  );
}

function HowItWorks() {
  const { ref, visible } = useReveal();
  return (
    <div id="how-it-works" style={{ background: "#fff", borderTop: "1px solid #e8e8ee", borderBottom: "1px solid #e8e8ee" }}>
      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "100px 48px" }}>
        <div ref={ref} style={{ textAlign: "center", marginBottom: 56, opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(20px)", transition: "opacity .6s, transform .6s" }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "#0369a1", marginBottom: 14 }}>Workflow</div>
          <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: "clamp(32px,4vw,52px)", fontWeight: 400, letterSpacing: "-.03em", color: "#0d0d12" }}>
            From signal to fix<br />in seconds.
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", position: "relative", opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(20px)", transition: "opacity .6s .1s, transform .6s .1s" }}>
          <div style={{ position: "absolute", top: 28, left: "calc(12.5% + 12px)", right: "calc(12.5% + 12px)", height: 1, background: "linear-gradient(90deg,transparent,#d0d0dc 20%,#d0d0dc 80%,transparent)" }} />
          {steps.map((s, i) => <StepCell key={i} {...s} />)}
        </div>
      </div>
    </div>
  );
}

function StepCell({ icon, num, title, desc }: { icon: string; num: string; title: string; desc: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{ textAlign: "center", padding: "0 24px", position: "relative", zIndex: 1 }}>
      <div style={{
        width: 56, height: 56, borderRadius: "50%", background: "#fff",
        border: `1px solid ${hovered ? "#0369a1" : "#d0d0dc"}`,
        boxShadow: hovered ? "0 0 0 4px #eeecfd" : "none",
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 20px", fontSize: 18, transition: "all .2s",
      }}>{icon}</div>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".1em", color: "#a8a8b8", textTransform: "uppercase", marginBottom: 10 }}>{num}</div>
      <h4 style={{ fontSize: 14, fontWeight: 600, color: "#0d0d12", letterSpacing: "-.02em", marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>{title}</h4>
      <p style={{ fontSize: 12.5, lineHeight: 1.6, color: "#767688", fontWeight: 300, fontFamily: "'DM Sans', sans-serif" }}>{desc}</p>
    </div>
  );
}

function Integrations() {
  const { ref, visible } = useReveal();
  const doubled = [...logos, ...logos];
  return (
    <section id="integrations" style={{ maxWidth: 1160, margin: "0 auto", padding: "100px 48px", textAlign: "center" }}>
      <div ref={ref} style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(20px)", transition: "opacity .6s, transform .6s" }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "#0369a1", marginBottom: 14 }}>Ecosystem</div>
        <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: "clamp(32px,4vw,52px)", fontWeight: 400, letterSpacing: "-.03em", color: "#0d0d12", marginBottom: 14 }}>Plugs into your stack.</h2>
        <p style={{ fontSize: 16, lineHeight: 1.65, color: "#767688", fontWeight: 300, maxWidth: 500, margin: "0 auto 48px", letterSpacing: "-.01em" }}>
          Works with the tools your team already uses — no rip-and-replace required.
        </p>
      </div>
      <div style={{ overflow: "hidden", WebkitMaskImage: "linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)" }}>
        <div style={{ display: "flex", gap: 12, width: "max-content", animation: "belt 22s linear infinite" }}>
          {doubled.map((l, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 9, padding: "12px 20px",
              border: "1px solid #e8e8ee", borderRadius: 10, background: "#fff",
              whiteSpace: "nowrap", fontSize: 13, fontWeight: 500, color: "#3a3a4a", letterSpacing: "-.01em",
            }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: l.c, flexShrink: 0 }} />
              {l.n}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}



export default function SentinelXLanding() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap');
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        html { scroll-behavior: smooth; font-size: 16px; }
        body { font-family: 'DM Sans', sans-serif; background: #fafafa; color: #0d0d12; overflow-x: hidden; -webkit-font-smoothing: antialiased; }
        a { text-decoration: none; color: inherit; }
        @keyframes pulse-g { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.6;transform:scale(.8)} }
        @keyframes belt { to { transform: translateX(-50%); } }
      `}</style>

      <Navbar />

      {/* HERO */}
      <section style={{
        position: "relative", minHeight: "100vh", display: "flex", alignItems: "center",
        padding: "100px 48px 80px", overflow: "hidden", background: "#fff",
        borderBottom: "1px solid #e8e8ee",
      }}>
        {/* Grid bg */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(#e8e8ee 1px,transparent 1px),linear-gradient(90deg,#e8e8ee 1px,transparent 1px)",
          backgroundSize: "48px 48px", opacity: .45,
          WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 50%,black 30%,transparent 100%)",
        }} />
        <HeroCanvas />

        <div style={{ maxWidth: 1160, margin: "0 auto", width: "100%", display: "grid", gridTemplateColumns: "1fr 420px", gap: 64, alignItems: "center", position: "relative" }}>
          {/* Left */}
          <div style={{ animation: "up .7s .1s both" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 11, fontWeight: 600, letterSpacing: ".09em", textTransform: "uppercase", color: "#0369a1", marginBottom: 24 }}>
              <div style={{ width: 20, height: 1.5, background: "#0369a1" }} />
              Data Reliability Platform
            </div>
            <h1 style={{ fontFamily: "'Instrument Serif', serif", fontSize: "clamp(42px,5.5vw,72px)", fontWeight: 400, lineHeight: 1.03, letterSpacing: "-.03em", color: "#0d0d12", marginBottom: 22 }}>
              Stop data downtime<br /><em style={{ fontStyle: "italic", color: "#0369a1" }}>before</em> it hits.
            </h1>
            <p style={{ fontSize: 17, lineHeight: 1.65, color: "#767688", fontWeight: 300, maxWidth: 460, marginBottom: 40, letterSpacing: "-.01em" }}>
              Platform that detects, diagnoses, and autonomously remediates data incidents in real-time. Connect OpenMetadata &amp; Airflow in two minutes.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <Link to="/register" style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "12px 24px", background: "#0369a1", color: "#fff",
                borderRadius: 10, fontSize: 14, fontWeight: 600, fontFamily: "inherit",
                border: "none", cursor: "pointer",
              }}>
                Start for free
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M8 3l4 4-4 4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </Link>
              <button
                onClick={() => window.open("https://drive.google.com/file/d/1zTKIaCkUtCgRroeRu0ImeFZ4AD12bpOS/view?usp=sharing", "_blank")}
                style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13.5, color: "#767688", fontWeight: 400, cursor: "pointer", border: "none", background: "none", fontFamily: "inherit" }}
              >
                <div style={{ width: 32, height: 32, borderRadius: "50%", border: "1.5px solid #d0d0dc", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3 2l5 3-5 3V2z" fill="currentColor" /></svg>
                </div>
                Watch demo
              </button>
            </div>
            <div style={{ marginTop: 48, display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ display: "flex" }}>
                {["AK", "RJ", "SL", "+"].map((a, i) => (
                  <div key={a} style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid #fff", background: "#eeecfd", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: "#0369a1", marginLeft: i === 0 ? 0 : -8 }}>{a}</div>
                ))}
              </div>
              <span style={{ fontSize: 12.5, color: "#767688" }}>Trusted by <strong style={{ color: "#0d0d12", fontWeight: 500 }}>800+ data teams</strong> worldwide</span>
            </div>
          </div>
          {/* Right */}
          <div style={{ animation: "up .7s .3s both" }}>
            <HeroDashCard />
          </div>
        </div>

        <style>{`@keyframes up{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>
      </section>
      <Features />
      <HowItWorks />
      <Integrations />

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid #e8e8ee", background: "#fff", padding: "28px 48px", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, fontWeight: 600, fontSize: 14, letterSpacing: "-.02em" }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: "#0d0d12", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z" stroke="#fff" strokeWidth="1.4" fill="none" /><circle cx="8" cy="8" r="2.5" fill="#fff" /></svg>
          </div>
          SentinelX
        </div>
        <span style={{ fontSize: 12, color: "#a8a8b8" }}>© 2025 SentinelX, Inc.</span>
        <div style={{ display: "flex", gap: 28 }}>
          {["Privacy", "Terms", "Docs", "Status"].map((l) => (
            <a key={l} href="#" style={{ fontSize: 12, color: "#a8a8b8" }}>{l}</a>
          ))}
        </div>
      </footer>
    </>
  );
}
