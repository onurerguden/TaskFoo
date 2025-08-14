// src/ws/client.ts
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import type { IMessage } from "@stomp/stompjs";

let stompClient: Client | null = null;

export function connectWebSocket() {
  if (stompClient && stompClient.connected) return;

  stompClient = new Client({
    webSocketFactory: () => new SockJS("/ws"),
    reconnectDelay: 5000,
    debug: () => {}, // sessiz
  });

  stompClient.activate();
}

export function disconnectWebSocket() {
  if (stompClient) {
    stompClient.deactivate();
    stompClient = null;
  }
}

/**
 * /topic/tasks'e subscribe olur ve gelen mesajı window'a CustomEvent olarak yayar.
 * App içinde yalnızca 1 kez çağırman yeterli.
 */
export function initTaskWs() {
  if (!stompClient) {
    connectWebSocket();
  }
  if (stompClient) {
    stompClient.onConnect = () => {
      stompClient!.subscribe("/topic/tasks", (msg: IMessage) => {
        let payload: any = msg.body;
        try {
          payload = JSON.parse(msg.body);
        } catch {
          // body düz string ise olduğu gibi kalır
        }

        const evt = new CustomEvent("taskfoo:task-event", { detail: payload });
        window.dispatchEvent(evt);
      });
    };
  }
}