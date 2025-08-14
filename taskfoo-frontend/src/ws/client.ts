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
    debug: () => {},
  });

  stompClient.activate();
}

export function disconnectWebSocket() {
  if (stompClient) {
    stompClient.deactivate();
    stompClient = null;
  }
}

export function initTaskWs(onEvent?: (evt: any) => void) {
  if (!stompClient) connectWebSocket();

  if (stompClient) {
    const handleMessage = (msg: IMessage) => {
      let data: any;
      try {
        data = JSON.parse(msg.body);
      } catch {
        data = msg.body;
      }

      // Normalle: { type, payload } şekline getir (backend bazen payload yerine data yolluyor olabilir)
      const type = data?.type ?? data?.eventType ?? "UNKNOWN";
      const payload = data?.payload ?? data?.data ?? data;

      // 1) İstersen callback’e geçir
      onEvent?.({ type, payload });

      // 2) Her durumda CustomEvent fırlat -> Board/Tasks’teki effect bunu dinliyor
      window.dispatchEvent(
        new CustomEvent("taskfoo:task-event", {
          detail: { type, payload },
        })
      );
    };

    const doSubscribe = () => {
      stompClient!.subscribe("/topic/tasks", handleMessage);
    };

    if (stompClient.connected) {
      doSubscribe();
    }

    stompClient.onConnect = () => {
      doSubscribe();
    };
  }
}