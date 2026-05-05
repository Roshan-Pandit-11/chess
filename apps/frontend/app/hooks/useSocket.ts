"use client"

import { useEffect, useState } from "react";

let socket: WebSocket | null = null;

export function useSocket() {
  const [ws, setWs] = useState<WebSocket | null>(socket);

  useEffect(() => {
    if (!socket) {
      socket = new WebSocket("ws://localhost:8080");

      socket.onopen = () => {
        setWs(socket);
      };

      socket.onclose = () => {
        socket = null;
        setWs(null);
      };

      socket.onerror = () => {
        socket?.close();
      };
    } else {
      setWs(socket);
    }
  }, []);

  return ws;
}