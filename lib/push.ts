/**
 * lib/push.ts
 *
 * Low-level helpers for Web Push.
 * Used by PushNotificationProvider — you shouldn't need to call these directly.
 */

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_KEY!;

/** Convert a base64url VAPID public key to the Uint8Array the browser expects. */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i);
  }
  return bytes;
}

/** True when the current browser supports Web Push. */
export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** Register (or retrieve an already-registered) service worker. */
async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  // Register (no-op if already registered), then wait for it to be active
  await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  return navigator.serviceWorker.ready;
}

/**
 * Ask the browser to create a push subscription and send it to the backend.
 * Returns true on success, false if the user denied permission.
 */
export async function subscribeToPush(authToken: string): Promise<boolean> {
  if (!isPushSupported()) return false;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const registration = await getServiceWorkerRegistration();

  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const sub = subscription.toJSON() as {
    endpoint: string;
    keys: { p256dh: string; auth: string };
    expirationTime?: number | null;
  };

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      endpoint: sub.endpoint,
      keys: sub.keys,
      expirationTime: sub.expirationTime ?? undefined,
    }),
  });

  return res.ok;
}

/**
 * Unsubscribe from push notifications and notify the backend.
 */
export async function unsubscribeFromPush(authToken: string): Promise<boolean> {
  if (!isPushSupported()) return false;

  const registration = await navigator.serviceWorker.ready;
  if (!registration) return false;

  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return true;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();

  const res = await fetch("/api/push/unsubscribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ endpoint }),
  });

  return res.ok;
}

/**
 * Returns the current browser-level permission state without prompting.
 */
export function getNotificationPermission(): NotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "default";
  }
  return Notification.permission;
}
