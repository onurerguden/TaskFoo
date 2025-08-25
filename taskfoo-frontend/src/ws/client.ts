// src/ws/client.ts
import SockJS from "sockjs-client";
import { Client, type IMessage, type StompSubscription } from "@stomp/stompjs";

let stomp: Client | null = null;
const activeSubs = new Map<string, StompSubscription>();
const pendingHandlers = new Map<string, (evt: any) => void>();
let tokenProvider: (() => string | null | undefined) | undefined;

/**
 * Low-level connect. Call once at app boot (optional). If not called, first subscribe triggers it.
 * You can pass a token getter to include Authorization on connect.
 */
export function wsConnect(getToken?: () => string | null | undefined) {
  if (stomp) return;
  tokenProvider = getToken;

  stomp = new Client({
    webSocketFactory: () => new SockJS("/ws"),
    reconnectDelay: 5000,
    debug: () => {},
    connectHeaders: getToken ? { Authorization: `Bearer ${getToken() ?? ""}` } : {},
  });

  // Re-subscribe all topics after (re)connect
  stomp.onConnect = () => {
    for (const [dest, handler] of pendingHandlers.entries()) {
      const sub = stomp!.subscribe(dest, (msg) => dispatch(dest, msg, handler));
      activeSubs.set(dest, sub);
    }
  };

  stomp.activate();
}

/** Graceful disconnect (clears all subscriptions). */
export function wsDisconnect() {
  for (const [, sub] of activeSubs) sub.unsubscribe();
  activeSubs.clear();
  pendingHandlers.clear();
  stomp?.deactivate();
  stomp = null;
}

/** Subscribe to a STOMP destination. Returns an unsubscribe fn. */
export function wsSubscribe(dest: string, onEvent: (evt: any) => void) {
  if (!stomp) wsConnect(tokenProvider);

  // store handler so we can re-subscribe after reconnect
  pendingHandlers.set(dest, onEvent);

  if (stomp?.connected) {
    const sub = stomp.subscribe(dest, (msg) => dispatch(dest, msg, onEvent));
    activeSubs.set(dest, sub);
  }

  // Unsubscribe function
  return () => {
    const sub = activeSubs.get(dest);
    sub?.unsubscribe();
    activeSubs.delete(dest);
    pendingHandlers.delete(dest);
  };
}

function dispatch(dest: string, msg: IMessage, handler: (evt: any) => void) {
  let data: any;
  try {
    data = JSON.parse(msg.body);
  } catch {
    data = msg.body;
  }
  const type = (data?.type ?? data?.eventType ?? "UNKNOWN") as string;
  const payload = data?.payload ?? data?.data ?? data;

  const evt = { type, payload, dest };

  // 1) component handler
  handler(evt);
  // 2) global CustomEvent (backward compatible with Board’s listener)
  window.dispatchEvent(new CustomEvent("taskfoo:task-event", { detail: evt }));
}

/**
 * Backward compatibility with the old API.
 * Subscribes to `/topic/tasks` and forwards as CustomEvent.
 */
export function connectWebSocket(getToken?: () => string | null | undefined) {
  wsConnect(getToken);
}

export function disconnectWebSocket() {
  wsDisconnect();
}

export function initTaskWs(onEvent?: (evt: any) => void) {
  // default global topic used previously
  return wsSubscribe("/topic/tasks", (evt) => onEvent?.(evt));
}