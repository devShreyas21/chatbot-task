// src/app/api/socket/route.js
import { Server } from "socket.io";
import { streamLLMResponse } from "@/lib/llm";

let io; // Singleton instance

export const config = {
  api: {
    bodyParser: false, // disable body parsing for WebSockets
  },
};

export async function GET() {
  return new Response("✅ Socket.IO is running via custom server.js", {
    status: 200,
  });
}
