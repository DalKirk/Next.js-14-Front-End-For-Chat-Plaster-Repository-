"use client";

/**
 * components/PushNotificationProvider.tsx
 *
 * Wrap your layout (or just the authenticated shell) with this component.
 * It handles:
 *   - Registering the service worker on mount
 *   - Prompting for permission after login (opt-in bell button)
 *   - Persisting the user's preference to localStorage so we don't re-prompt
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
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
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
  authToken: string | null;
  children: React.ReactNode;
}

export default function PushNotificationProvider({ authToken: authTokenProp, children }: Props) {
  const [isSupported] = useState(() => isPushSupported());
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fall back to localStorage token when no prop is provided
  const getToken = () =>
    authTokenProp ?? (typeof window !== "undefined" ? localStorage.getItem("auth-token") : null);

  const authToken = getToken();

  useEffect(() => {
    if (!isSupported) return;

    setPermission(getNotificationPermission());

    const token = getToken();
    if (token) {
      fetch("/api/push/status", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data) => setIsSubscribed(data.subscribed ?? false))
        .catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSupported, authTokenProp]);

  const subscribe = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setError("You must be logged in to enable notifications.");
      return;
    }
    setError(null);
    try {
      const ok = await subscribeToPush(token);
      if (ok) {
        setIsSubscribed(true);
        setPermission("granted");
      } else {
        setPermission(getNotificationPermission());
        if (Notification.permission === "denied") {
          setError("Notifications are blocked. Please allow them in your browser settings.");
        }
      }
    } catch (err) {
      setError("Failed to enable notifications. Please try again.");
      console.error("[Push] subscribe error:", err);
    }
  }, [authTokenProp]);

  const unsubscribe = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setError(null);
    try {
      await unsubscribeFromPush(token);
      setIsSubscribed(false);
    } catch (err) {
      setError("Failed to disable notifications.");
      console.error("[Push] unsubscribe error:", err);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authTokenProp]);

  return (
    <PushContext.Provider
      value={{ isSupported, permission, isSubscribed, subscribe, unsubscribe, error }}
    >
      {children}
    </PushContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ready-made bell button
// ─────────────────────────────────────────────────────────────────────────────

export function NotificationBellButton({ className = "" }: { className?: string }) {
  const { isSupported, permission, isSubscribed, subscribe, unsubscribe, error } =
    usePushNotifications();

  if (!isSupported) return null;

  const handleClick = () => {
    if (isSubscribed) unsubscribe();
    else subscribe();
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
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            <circle cx="19" cy="5" r="3" fill="currentColor" stroke="none" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        )}
      </button>

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
