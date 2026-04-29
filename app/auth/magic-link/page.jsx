"use client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function MagicLinkContent() {
  const searchParams = useSearchParams();
  const isForgot = searchParams.get("reason") === "forgot";

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/magic-link/request`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to send link. Please try again.");
      }

      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* Glow */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "600px",
          height: "400px",
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.15) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "16px",
          padding: "40px 32px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Logo / Title */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{
              fontSize: "28px",
              fontWeight: 700,
              background: "linear-gradient(135deg, #a78bfa, #06b6d4)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              marginBottom: "8px",
            }}
          >
            Starcyeed
          </div>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "18px", fontWeight: 600, margin: "0 0 4px" }}>
            {isForgot ? "Recover your account" : "Sign in with a magic link"}
          </p>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", margin: 0 }}>
            {isForgot
              ? "Enter your email and we'll send you a link to get back in."
              : "Enter your email and we'll send you a one-time login link."}
          </p>
        </div>

        {sent ? (
          /* ── Success state ── */
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>📬</div>
            <h2 style={{ color: "#fff", fontSize: "20px", fontWeight: 600, marginBottom: "12px" }}>
              Check your email
            </h2>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "14px", lineHeight: 1.6 }}>
              We sent a login link to{" "}
              <strong style={{ color: "rgba(255,255,255,0.85)" }}>{email}</strong>.
              It expires in 15 minutes.
            </p>
            <button
              onClick={() => { setSent(false); setEmail(""); }}
              style={{
                marginTop: "24px",
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "8px",
                color: "rgba(255,255,255,0.6)",
                fontSize: "13px",
                padding: "10px 20px",
                cursor: "pointer",
              }}
            >
              Send to a different email
            </button>
          </div>
        ) : (
          /* ── Form ── */
          <form onSubmit={handleSubmit}>
            <label
              style={{
                display: "block",
                color: "rgba(255,255,255,0.6)",
                fontSize: "12px",
                fontWeight: 500,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                marginBottom: "8px",
              }}
            >
              Email address
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "10px",
                color: "#fff",
                fontSize: "15px",
                padding: "12px 14px",
                outline: "none",
                boxSizing: "border-box",
                marginBottom: "16px",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "rgba(167,139,250,0.6)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
            />

            {error && (
              <p
                style={{
                  color: "#f87171",
                  fontSize: "13px",
                  marginBottom: "12px",
                  padding: "10px 12px",
                  background: "rgba(248,113,113,0.08)",
                  borderRadius: "8px",
                  border: "1px solid rgba(248,113,113,0.2)",
                }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              style={{
                width: "100%",
                padding: "13px",
                borderRadius: "10px",
                border: "none",
                background:
                  loading || !email
                    ? "rgba(139,92,246,0.3)"
                    : "linear-gradient(135deg, #7c3aed, #06b6d4)",
                color: "#fff",
                fontSize: "15px",
                fontWeight: 600,
                cursor: loading || !email ? "not-allowed" : "pointer",
                transition: "opacity 0.2s",
                opacity: loading || !email ? 0.6 : 1,
              }}
            >
              {loading ? "Sending…" : "Send login link"}
            </button>

            <p style={{ textAlign: "center", marginTop: "24px", fontSize: "13px", color: "rgba(255,255,255,0.35)" }}>
              Have a password?{" "}
              <Link href="/" style={{ color: "rgba(167,139,250,0.8)", textDecoration: "none" }}>
                Sign in here
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

export default function MagicLinkPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 32, height: 32, border: "3px solid rgba(167,139,250,0.2)", borderTop: "3px solid #a78bfa", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
      </div>
    }>
      <MagicLinkContent />
    </Suspense>
  );
}
