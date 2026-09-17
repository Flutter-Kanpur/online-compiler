import React, { useState } from "react";
import { Zap, Loader2, AlertCircle, Mail } from "lucide-react";
import { useAuth } from "../lib/auth.jsx";

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
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg-app)" }}>
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
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg-app)" }}>
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
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg-app)" }}>
      <div className="card p-8 w-full max-w-sm">
        <div
          className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #13B9FD 0%, #0553B1 100%)" }}
        >
          <Zap size={22} color="white" strokeWidth={2.5} fill="white" />
        </div>
        <div className="text-lg font-bold text-center mb-1" style={{ color: "var(--text-primary)" }}>
          Flutter Kanpur
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

          <button type="submit" disabled={busy} className="btn-primary w-full justify-center">
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
