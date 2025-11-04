// src/app/api/chat/route.js
import { streamLLMResponse } from "@/lib/llm";

export async function POST(req) {
  const { message } = await req.json();

  const chunks = [];
  await streamLLMResponse(message, (chunk) => chunks.push(chunk));

  return new Response(JSON.stringify({ response: chunks.join("") }), {
    headers: { "Content-Type": "application/json" },
  });
}