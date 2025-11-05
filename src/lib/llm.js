// src/lib/llm.js
export async function streamLLMResponse(userMessage, modelProvider, onChunk) {
    let apiKey, url, model;

    if (modelProvider === "groq") {
        apiKey = process.env.GROQ_API_KEY;
        url = "https://api.groq.com/openai/v1/chat/completions";
        model = "llama-3.3-70b-versatile";
    } else if (modelProvider === "openai") {
        apiKey = process.env.OPENAI_API_KEY;
        url = "https://api.openai.com/v1/chat/completions";
        model = "gpt-3.5-turbo";
    } else if (modelProvider === "gemini") {
        apiKey = process.env.GEMINI_API_KEY;
        url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    }

    if (!apiKey) throw new Error(`Missing API key for ${modelProvider}`);

    // Build request body
    const body =
        modelProvider === "gemini"
            ? JSON.stringify({
                contents: [{ parts: [{ text: userMessage }] }],
            })
            : JSON.stringify({
                model,
                stream: true,
                messages: [
                    { role: "system", content: "You are a helpful AI assistant." },
                    { role: "user", content: userMessage },
                ],
            });

    // Send request
    const response = await fetch(url, {
        method: "POST",
        headers:
            modelProvider === "gemini"
                ? { "Content-Type": "application/json" }
                : {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
        body,
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`${modelProvider.toUpperCase()} API error: ${err}`);
    }

    // ✅ Gemini 2.0 Flash uses non-streaming API
    if (modelProvider === "gemini") {
        const json = await response.json();
        const content = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (content) onChunk(content);
        return;
    }

    // ✅ Streaming for Groq/OpenAI
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((line) => line.trim() !== "");

        for (const line of lines) {
            if (line.startsWith("data: ")) {
                const data = line.replace("data: ", "");
                if (data === "[DONE]") return;

                try {
                    const json = JSON.parse(data);
                    const content = json.choices?.[0]?.delta?.content;
                    if (content) onChunk(content);
                } catch (e) {
                    console.error(`${modelProvider} stream parse error`, e);
                }
            }
        }
    }
}
