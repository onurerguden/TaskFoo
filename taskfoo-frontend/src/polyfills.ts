// src/polyfills.ts
// SockJS ve bazı paketler Node global'lerini bekler.
// Tarayıcıda bunları window üzerinden polyfill ediyoruz.

declare global {
  interface Window {
    global: any;
    process: any;
  }
}

if (typeof window !== "undefined") {
  if (typeof window.global === "undefined") {
    (window as any).global = window;
  }
  if (typeof window.process === "undefined") {
    (window as any).process = { env: {} };
  }
}

export {};