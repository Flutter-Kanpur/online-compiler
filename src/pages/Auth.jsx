import React, { useState, useEffect, useRef } from "react";
import { Zap, Loader2, AlertCircle, Mail } from "lucide-react";
import { useAuth } from "../lib/auth.jsx";

// Fixed (module-load-time, not per-render) star field for the auth background.
const STARS = Array.from({ length: 40 }, (_, i) => {
  const seed = i * 137.5;
  return {
    top: `${(seed * 1.7) % 100}%`,
    left: `${(seed * 2.3) % 100}%`,
    size: 1 + ((i * 7) % 3),
    dur: 2 + ((i * 3) % 4),
    delay: (i % 8) * 0.4,
  };
});

function useParallax(ref) {
  useEffect(() => {
    function onMove(e) {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      if (ref.current) {
        ref.current.style.transform = `translate(${x * 14}px, ${y * 14}px)`;
      }
    }
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [ref]);
}

// Isometric cube-grid field that rises and glows near the cursor — a light-theme
// take on the wireframe cube hero effect (mouse-reactive "extruded tile" grid).
function drawDiamond(ctx, cx, cy, w, h) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - h / 2);
  ctx.lineTo(cx + w / 2, cy);
  ctx.lineTo(cx, cy + h / 2);
  ctx.lineTo(cx - w / 2, cy);
  ctx.closePath();
}

function IsoCubeField() {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const tileW = 92;
    const tileH = 50;
    const maxElev = 34;
    const sigma = 170;
    let width, height, raf, dpr;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    function onMove(e) {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    window.addEventListener("mousemove", onMove);

    function draw(t) {
      ctx.clearRect(0, 0, width, height);
      const originX = width / 2;
      const originY = height * 0.12;
      const n = Math.ceil(Math.max(width / tileW, height / tileH)) + 6;
      const { x: mx, y: my } = mouseRef.current;
      const time = t / 1000;

      for (let row = -n; row < n; row++) {
        for (let col = -n; col < n; col++) {
          const cx = originX + (col - row) * (tileW / 2);
          const by = originY + (col + row) * (tileH / 2);
          if (cx < -tileW || cx > width + tileW || by < -tileH || by > height + tileH) continue;

          const dist = Math.hypot(cx - mx, by - my);
          const ambient = Math.sin(time * 0.5 + col * 0.5) * Math.cos(time * 0.4 + row * 0.5) * 1.1;
          const mouseElev = maxElev * Math.exp(-(dist * dist) / (2 * sigma * sigma));
          const elev = Math.max(0.6, ambient + mouseElev);
          const glow = Math.min(1, mouseElev / maxElev);
          const topY = by - elev;

          if (elev < 1.2) {
            drawDiamond(ctx, cx, by, tileW, tileH);
            ctx.strokeStyle = "rgba(5, 83, 177, 0.07)";
            ctx.lineWidth = 1;
            ctx.stroke();
            continue;
          }

          // left face
          ctx.beginPath();
          ctx.moveTo(cx - tileW / 2, topY);
          ctx.lineTo(cx, topY + tileH / 2);
          ctx.lineTo(cx, by + tileH / 2);
          ctx.lineTo(cx - tileW / 2, by);
          ctx.closePath();
          ctx.fillStyle = `rgba(124, 58, 237, ${0.08 + glow * 0.22})`;
          ctx.fill();
          ctx.strokeStyle = `rgba(124, 58, 237, ${0.25 + glow * 0.4})`;
          ctx.lineWidth = 1;
          ctx.stroke();

          // right face
          ctx.beginPath();
          ctx.moveTo(cx + tileW / 2, topY);
          ctx.lineTo(cx, topY + tileH / 2);
          ctx.lineTo(cx, by + tileH / 2);
          ctx.lineTo(cx + tileW / 2, by);
          ctx.closePath();
          ctx.fillStyle = `rgba(19, 185, 253, ${0.1 + glow * 0.28})`;
          ctx.fill();
          ctx.strokeStyle = `rgba(19, 185, 253, ${0.3 + glow * 0.45})`;
          ctx.stroke();

          // top face
          drawDiamond(ctx, cx, topY, tileW, tileH);
          ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + glow * 0.4})`;
          ctx.fill();
          ctx.strokeStyle = `rgba(5, 83, 177, ${0.3 + glow * 0.55})`;
          ctx.lineWidth = 1.1;
          ctx.stroke();
        }
      }
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />;
}

function AuthBackground({ children }) {
  const sceneRef = useRef(null);
  useParallax(sceneRef);

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 overflow-hidden"
         style={{ background: "linear-gradient(160deg, #eef7ff 0%, #f3f0ff 50%, #eafcff 100%)" }}>
      <div ref={sceneRef} style={{ position: "absolute", inset: 0 }}>
        <div className="auth-blob" style={{ width: 420, height: 420, top: "-12%", left: "-10%", background: "#13B9FD", opacity: 0.22, animationDuration: "22s" }} />
        <div className="auth-blob" style={{ width: 360, height: 360, bottom: "-12%", right: "-8%", background: "#7c3aed", opacity: 0.18, animationDuration: "26s", animationDelay: "3s" }} />
        <div className="auth-blob" style={{ width: 280, height: 280, top: "30%", right: "18%", background: "#0553B1", opacity: 0.12, animationDuration: "19s", animationDelay: "1s" }} />

        {STARS.map((s, i) => (
          <span
            key={i}
            className="auth-star"
            style={{
              top: s.top, left: s.left, width: s.size, height: s.size,
              animationDuration: `${s.dur}s`, animationDelay: `${s.delay}s`,
            }}
          />
        ))}
      </div>

      <IsoCubeField />

      <div className="relative z-10 w-full flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

export default function Auth() {
  const { configured, signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState("signin"); // 'signin' | 'signup'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [checkEmail, setCheckEmail] = useState(false);

  if (!configured) {
    return (
      <AuthBackground>
        <div className="auth-card-wrap">
          <div className="card p-8 max-w-md text-center">
            <AlertCircle size={28} className="mx-auto mb-3" style={{ color: "#b45309" }} />
            <div className="text-base font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
              Supabase isn't configured yet
            </div>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Copy <code className="font-mono px-1 rounded" style={{ background: "#f4f4f5" }}>.env.example</code> to{" "}
              <code className="font-mono px-1 rounded" style={{ background: "#f4f4f5" }}>.env</code>, fill in your
              Supabase project URL + anon key, run the SQL in{" "}
              <code className="font-mono px-1 rounded" style={{ background: "#f4f4f5" }}>supabase/migrations/0001_init.sql</code>,
              then restart the dev server.
            </p>
          </div>
        </div>
      </AuthBackground>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error: err } = await signUpWithEmail(email, password, { username, name });
        if (err) throw err;
        setCheckEmail(true);
      } else {
        const { error: err } = await signInWithEmail(email, password);
        if (err) throw err;
      }
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    const { error: err } = await signInWithGoogle();
    if (err) setError(err.message || String(err));
  }

  if (checkEmail) {
    return (
      <AuthBackground>
        <div className="auth-card-wrap">
          <div className="card p-8 max-w-sm text-center">
            <Mail size={28} className="mx-auto mb-3" style={{ color: "var(--accent)" }} />
            <div className="text-base font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Check your email</div>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              We sent a confirmation link to <b>{email}</b>. Click it, then come back and sign in.
            </p>
            <button className="btn-secondary w-full justify-center mt-5" onClick={() => { setCheckEmail(false); setMode("signin"); }}>
              Back to sign in
            </button>
          </div>
        </div>
      </AuthBackground>
    );
  }

  return (
    <AuthBackground>
      <div className="auth-card-wrap w-full max-w-sm">
      <div className="card p-8 w-full max-w-sm">
        <div
          className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #13B9FD 0%, #0553B1 100%)", animation: "logoGlow 2.6s ease-in-out infinite" }}
        >
          <Zap size={22} color="white" strokeWidth={2.5} fill="white" />
        </div>
        <div className="text-2xl font-bold text-center tracking-tight" style={{ color: "var(--text-primary)" }}>
          Sparx
        </div>
        <div
          className="text-center mb-4"
          style={{ color: "var(--accent)", fontFamily: "'Dancing Script', cursive", fontSize: "22px", fontWeight: 700, marginTop: "-4px" }}
        >
          by Flutter Kanpur
        </div>
        <p className="text-sm text-center mb-6" style={{ color: "var(--text-secondary)" }}>
          {mode === "signin" ? "Sign in to track your progress." : "Create an account to start solving."}
        </p>

        <button onClick={handleGoogle} className="btn-secondary w-full justify-center mb-4">
          <GoogleIcon /> Continue with Google
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>or</span>
          <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="input-field" />
              <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" className="input-field" />
            </>
          )}
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="input-field" />
          <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="input-field" />

          {error && <div className="text-xs" style={{ color: "#b91c1c" }}>{error}</div>}

          <button type="submit" disabled={busy} className="btn-primary auth-btn-shimmer w-full justify-center">
            {busy ? <Loader2 size={14} className="animate-spin" /> : null}
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <div className="text-center text-xs mt-5" style={{ color: "var(--text-muted)" }}>
          {mode === "signin" ? (
            <>Don't have an account?{" "}
              <button className="font-semibold" style={{ color: "var(--accent)" }} onClick={() => setMode("signup")}>Sign up</button>
            </>
          ) : (
            <>Already have an account?{" "}
              <button className="font-semibold" style={{ color: "var(--accent)" }} onClick={() => setMode("signin")}>Sign in</button>
            </>
          )}
        </div>
      </div>
      </div>
    </AuthBackground>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6 29.6 4 24 4c-7.6 0-14.1 4.3-17.7 10.7z"/>
      <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.6C29.6 35 26.9 36 24 36c-5.3 0-9.7-3.4-11.3-8l-6.6 5.1C9.8 39.6 16.3 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.7l6.6 5.6C41.7 36 44 30.6 44 24c0-1.2-.1-2.4-.4-3.5z"/>
    </svg>
  );
}
