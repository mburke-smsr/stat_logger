import React, { useState } from "react";
import { apiFetch } from "../api";

type Props = {
  onLoggedIn: () => Promise<void>;
};

export default function LoginPage({ onLoggedIn }: Props) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function devLogin() {
    setErr(null);
    setLoading(true);
    try {
      await apiFetch("/auth/dev-login", {
        method: "POST",
        body: JSON.stringify({ email, name: name || undefined }),
      });
      await onLoggedIn();
    } catch (e: any) {
      setErr(e?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="loginWrap">
      <div className="loginCard">
        <div className="loginHeader">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="brandMark" />
            <div>
              <div className="loginTitle">SMSR Training Log</div>
              <div className="loginSub">
                Dev login for now (email-only). Google Workspace auth comes later.
              </div>
            </div>
          </div>
        </div>

        <div className="loginBody">
          <div className="grid">
            <div>
              <div className="label">Email</div>
              <input
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@smsr.org"
              />
            </div>

            <div>
              <div className="label">Name (optional)</div>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Michael Burke"
              />
            </div>

            {err ? (
              <div className="pill" style={{ borderColor: "rgba(248,113,113,0.35)", color: "rgba(255,255,255,0.85)" }}>
                {err}
              </div>
            ) : null}

            <button
              className="btn btnPrimary"
              onClick={devLogin}
              disabled={!email || loading}
              style={{ padding: "12px 12px", borderRadius: 16, fontWeight: 700 }}
            >
              {loading ? "Signing in…" : "Continue"}
            </button>

            <div style={{ color: "var(--muted2)", fontSize: 12, lineHeight: 1.4 }}>
              Tip: use your SMSR email. Once Google auth is wired, this screen becomes a “Sign in with Google”
              button and optional access request flow.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
