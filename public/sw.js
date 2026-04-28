/**
 * Service Worker for Web Push Notifications
 *
 * Location: /public/sw.js  (served at https://yourdomain.com/sw.js)
 * This path is non-negotiable — browsers only grant push permission
 * to a service worker at the root scope.
 */

const CACHE_VERSION = "v1";

// ─────────────────────────────────────────────────────────────────────────────
// Install & Activate
// ─────────────────────────────────────────────────────────────────────────────

self.addEventListener("install", () => {
  // Take control immediately rather than waiting for old SW to die
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

// ─────────────────────────────────────────────────────────────────────────────
// Push event — fired when FCM/browser push service delivers a message
// ─────────────────────────────────────────────────────────────────────────────

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    // Plain-text fallback
    payload = { title: "New notification", body: event.data.text(), url: "/" };
  }

  const { title, body, icon, badge, url, data } = payload;

  const options = {
    body: body || "",
    icon: icon || "/icon-192.png",
    badge: badge || "/badge-72.png",
    // data is forwarded to the notificationclick handler
    data: { url: url || "/", ...(data || {}) },
    // Show the notification even if the app tab is open
    requireInteraction: false,
    // Group notifications from the same app together on Android
    tag: "app-notification",
    renotify: true,
    // Action buttons (optional — remove if you don't need them)
    actions: [
      { action: "open", title: "View" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ─────────────────────────────────────────────────────────────────────────────
// Notification click — open or focus the correct page
// ─────────────────────────────────────────────────────────────────────────────

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // If a tab with our origin is already open, focus it and navigate
        for (const client of windowClients) {
          if (new URL(client.url).origin === self.location.origin) {
            client.focus();
            return client.navigate(targetUrl);
          }
        }
        // Otherwise open a new tab
        return clients.openWindow(targetUrl);
      })
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Push subscription change — browser auto-rotates the subscription
// ─────────────────────────────────────────────────────────────────────────────

self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    event.newSubscription
      ? fetch("/api/push/resubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            old_endpoint: event.oldSubscription?.endpoint,
            new_subscription: event.newSubscription.toJSON(),
          }),
        })
      : Promise.resolve()
  );
});
