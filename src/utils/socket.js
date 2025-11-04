// src/utils/socket.js
import { io } from "socket.io-client";

let socket;

export function initSocket() {
  if (!socket) {
    socket = io({
      path: "/api/socket",
    });

    socket.on("connect", () => {
      console.log("🟢 Connected to WebSocket:", socket.id);
    });

    socket.on("disconnect", () => {
      console.log("🔴 Disconnected from WebSocket");
    });
  }

  return socket;
}

export function getSocket() {
  if (!socket) throw new Error("Socket not initialized");
  return socket;
}
