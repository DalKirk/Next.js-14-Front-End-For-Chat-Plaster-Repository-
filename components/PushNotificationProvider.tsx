"use client";

/**
 * components/PushNotificationProvider.tsx
 *
 * Wrap your layout (or just the authenticated shell) with this component.
 * It handles:
 *   - Registering the service worker on mount
 *   - Prompting for permission after login (opt-in bell button)
 *   - Persisting the user's preference to localStorage so we don't re-prompt
 *
 * Usage in app/layout.tsx (or your auth shell):
 *
 *   import PushNotificationProvider from "@/components/PushNotificationProvider";
 *
 *   export default function Layout({ children }) {
 *     return (
 *       <PushNotificationProvider authToken={token}>
 *         {children}
 *       </PushNotificationProvider>
 *     );
 *   }
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
  getNotificationPermission,
} from "@/lib/push";

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

interface PushContextValue {
  /** Whether the browser supports push at all */
  isSupported: boolean;
  /** Current Notification.permission value */
  permission: NotificationPermission;
  /** True once the user has subscribed via this app */
  isSubscribed: boolean;
  /** Call this when the user clicks the "Enable notifications" button */
  subscribe: () => Promise<void>;
  /** Call this when the user disables notifications in settings */
  unsubscribe: () => Promise<void>;
  /** Any error message to surface in your UI */
  error: string | null;
}

const PushContext = createContext<PushContextValue>({
  isSupported: false,
  permission: "default",
  isSubscribed: false,
  subscribe: async () => {},
  unsubscribe: async () => {},
  error: null,
});

export const usePushNotifications = () => useContext(PushContext);

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  /** JWT from your auth system — forwarded to the backend when saving the subscription */
  authToken: string | null;
  children: React.ReactNode;
}

export default function PushNotificationProvider({ authToken: authTokenProp, children }: Props) {
  const [isSupported] = useState(() => isPushSupported());
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Resolved token: prop takes priority, then localStorage (with a retry for
  // iOS Safari where localStorage may not be readable on the first tick).
  const [resolvedToken, setResolvedToken] = useState<string | null>(authTokenProp);

  // Sync prop changes immediately
  useEffect(() => {
    if (authTokenProp) setResolvedToken(authTokenProp);
  }, [authTokenProp]);

  // On mount, if the prop is absent try localStorage — and retry once after
  // 500 ms for iOS Safari where storage access can be deferred.
  useEffect(() => {
    if (authTokenProp) return; // prop already provided, nothing to do

    const readStorage = () =>
      typeof window !== "undefined"
        ? localStorage.getItem("auth-token") ??
          localStorage.getItem("token") ??
          null
        : null;

    const immediate = readStorage();
    if (immediate) {
      setResolvedToken(immediate);
      return;
    }

    // Retry after a short delay (iOS Safari may not expose storage immediately)
    const timer = setTimeout(() => {
      const delayed = readStorage();
      if (delayed) setResolvedToken(delayed);
    }, 500);

    return () => clearTimeout(timer);
  }, [authTokenProp]);

  // On mount: read actual browser permission + check if we already subscribed
  useEffect(() => {
    if (!isSupported || !resolvedToken) return;

    setPermission(getNotificationPermission());

    // Check backend subscription status
    fetch("/api/push/status", {
      headers: { Authorization: `Bearer ${resolvedToken}` },
    })
      .then((r) => r.json())
      .then((data) => setIsSubscribed(data.subscribed ?? false))
      .catch(() => {}); // non-fatal
  }, [isSupported, resolvedToken]);

  const subscribe = useCallback(async () => {
    if (!resolvedToken) {
      setError("You must be logged in to enable notifications.");
      return;
    }
    setError(null);
    try {
      const ok = await subscribeToPush(resolvedToken);
      if (ok) {
        setIsSubscribed(true);
        setPermission("granted");
      } else {
        setPermission(getNotificationPermission());
        if (Notification.permission === "denied") {
          setError(
            "Notifications are blocked. Please allow them in your browser settings."
          );
        }
      }
    } catch (err) {
      setError("Failed to enable notifications. Please try again.");
      console.error("[Push] subscribe error:", err);
    }
  }, [resolvedToken]);

  const unsubscribe = useCallback(async () => {
    if (!resolvedToken) return;
    setError(null);
    try {
      await unsubscribeFromPush(resolvedToken);
      setIsSubscribed(false);
    } catch (err) {
      setError("Failed to disable notifications.");
      console.error("[Push] unsubscribe error:", err);
    }
  }, [resolvedToken]);

  return (
    <PushContext.Provider
      value={{ isSupported, permission, isSubscribed, subscribe, unsubscribe, error }}
    >
      {children}
    </PushContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ready-made bell button — drop this anywhere in your nav/header
// ─────────────────────────────────────────────────────────────────────────────

function isIosBrowser(): boolean {
  if (typeof window === "undefined") return false;
  const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  const isStandalone = (window.navigator as any).standalone === true;
  return isIos && !isStandalone;
}

export function NotificationBellButton({ className = "" }: { className?: string }) {
  const { isSupported, permission, isSubscribed, subscribe, unsubscribe, error } =
    usePushNotifications();
  const [showIosHint, setShowIosHint] = React.useState(false);

  // iOS Safari browser tab — push not supported, show "Add to Home Screen" hint
  if (isIosBrowser()) {
    return (
      <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
        <button
          onClick={() => setShowIosHint((v) => !v)}
          aria-label="Enable notifications"
          title="Enable notifications on iOS"
          className={className}
          style={{ background: "none", border: "none", cursor: "pointer", padding: "0.4rem", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.5 }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </button>
        {showIosHint && (
          <span role="tooltip" style={{ position: "absolute", top: "110%", right: 0, background: "#1e293b", color: "#fff", fontSize: "12px", padding: "8px 12px", borderRadius: "8px", zIndex: 50, boxShadow: "0 2px 8px rgba(0,0,0,0.2)", maxWidth: "220px", lineHeight: 1.5 }}>
            To get notifications on iPhone: tap <strong>Share ↑</strong> then <strong>Add to Home Screen</strong>, and open the app from there.
          </span>
        )}
      </div>
    );
  }

  if (!isSupported) return null;

  const handleClick = () => {
    if (isSubscribed) {
      unsubscribe();
    } else {
      subscribe();
    }
  };

  const label = isSubscribed
    ? "Disable notifications"
    : permission === "denied"
    ? "Notifications blocked"
    : "Enable notifications";

  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <button
        onClick={handleClick}
        disabled={permission === "denied"}
        aria-label={label}
        title={label}
        className={className}
        style={{
          background: "none",
          border: "none",
          cursor: permission === "denied" ? "not-allowed" : "pointer",
          padding: "0.4rem",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: permission === "denied" ? 0.4 : 1,
          transition: "opacity 0.2s",
        }}
      >
        {isSubscribed ? (
          // Bell-on SVG
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            <circle cx="19" cy="5" r="3" fill="currentColor" stroke="none" />
          </svg>
        ) : (
          // Bell-off SVG
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        )}
      </button>

      {/* Inline error toast (auto-dismiss handled by parent if needed) */}
      {error && (
        <span
          role="alert"
          style={{
            position: "absolute",
            top: "110%",
            right: 0,
            background: "#fee2e2",
            color: "#991b1b",
            fontSize: "12px",
            padding: "6px 10px",
            borderRadius: "6px",
            whiteSpace: "nowrap",
            zIndex: 50,
            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
          }}
        >
          {error}
        </span>
      )}
    </div>
  );
}
