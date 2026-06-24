// Guarded service worker registration.
// NEVER register in dev, in iframe previews, or on Lovable preview hosts.
// Honors `?sw=off` kill switch.

export function registerServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  if (!import.meta.env.PROD) return;

  const url = new URL(window.location.href);
  if (url.searchParams.get("sw") === "off") {
    unregisterAll();
    return;
  }

  const inIframe = window.self !== window.top;
  if (inIframe) return;

  const host = window.location.hostname;
  const blockedHost =
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host === "lovableproject.com" ||
    host.endsWith(".lovableproject.com") ||
    host === "lovableproject-dev.com" ||
    host.endsWith(".lovableproject-dev.com") ||
    host === "beta.lovable.dev" ||
    host.endsWith(".beta.lovable.dev");

  if (blockedHost) {
    unregisterAll();
    return;
  }

  // Dynamically import so dev/preview never loads workbox.
  import("workbox-window")
    .then(({ Workbox }) => {
      const wb = new Workbox("/sw.js", { scope: "/" });
      wb.addEventListener("waiting", () => {
        wb.messageSkipWaiting();
      });
      wb.addEventListener("controlling", () => {
        window.location.reload();
      });
      wb.register().catch((err) => console.warn("[sw] register failed", err));
    })
    .catch(() => {
      // ignore — sw is optional
    });
}

function unregisterAll() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => {
      if (reg.active?.scriptURL.endsWith("/sw.js")) {
        reg.unregister().catch(() => undefined);
      }
    });
  });
}
