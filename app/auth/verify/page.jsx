"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setError("No token found in link.");
      return;
    }

    async function verify() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/magic-link/verify`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          }
        );

        if (!res.ok) {
          setError("This link is invalid or has expired. Please request a new one.");
          return;
        }

        const data = await res.json();

        // Store user + token the same way the rest of the app does
        if (data.user) {
          const { sanitizeUserForStorage } = await import("@/lib/utils");
          localStorage.setItem("chat-user", JSON.stringify(sanitizeUserForStorage(data.user)));
        }
        localStorage.setItem("auth-token", data.access_token);

        router.push("/chat");
      } catch {
        setError("Something went wrong. Please try again.");
      }
    }

    verify();
  }, [searchParams, router]);

  if (error) {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
        <h2 style={{ color: "#fff", fontSize: "20px", fontWeight: 600, marginBottom: "12px" }}>
          Link expired or invalid
        </h2>
        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "14px", lineHeight: 1.6, marginBottom: "24px" }}>
          {error}
        </p>
        <a
          href="/auth/magic-link"
          style={{
            display: "inline-block",
            padding: "12px 24px",
            borderRadius: "10px",
            background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
            color: "#fff",
            fontWeight: 600,
            fontSize: "14px",
            textDecoration: "none",
          }}
        >
          Request a new link
        </a>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center" }}>
      {/* Spinner */}
      <div
        style={{
          width: "48px",
          height: "48px",
          border: "3px solid rgba(167,139,250,0.2)",
          borderTop: "3px solid #a78bfa",
          borderRadius: "50%",
          margin: "0 auto 20px",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "15px" }}>
        Logging you in…
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function VerifyPage() {
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
          padding: "48px 32px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Logo */}
        <div
          style={{
            textAlign: "center",
            fontSize: "22px",
            fontWeight: 700,
            background: "linear-gradient(135deg, #a78bfa, #06b6d4)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            marginBottom: "32px",
          }}
        >
          Starcyeed
        </div>

        <Suspense
          fallback={
            <p style={{ color: "rgba(255,255,255,0.5)", textAlign: "center" }}>
              Loading…
            </p>
          }
        >
          <VerifyContent />
        </Suspense>
      </div>
    </div>
  );
}
