// server.js
import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";
import { streamLLMResponse } from "./src/lib/llm.js";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => handle(req, res));

  // Initialize Socket.IO
  const io = new Server(httpServer, {
    path: "/api/socket",
    cors: {
      origin: "*",
    },
  });

  io.on("connection", (socket) => {
    console.log("🟢 Client connected:", socket.id);

    socket.on("user_message", async (message) => {
      console.log("📨 Received:", message);

      try {
        await streamLLMResponse(message, (chunk) => {
          socket.emit("ai_message_chunk", chunk);
        });
        socket.emit("ai_message_done");
      } catch (err) {
        console.error("❌ LLM error:", err);
        socket.emit("ai_message_error", err.message);
      }
    });

    socket.on("disconnect", () => {
      console.log("🔴 Client disconnected:", socket.id);
    });
  });

  const port = process.env.PORT || 3000;
  httpServer.listen(port, () =>
    console.log(`🚀 Server ready on http://localhost:${port}`)
  );
});
