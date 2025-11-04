// src/lib/llm.js
// export async function streamLLMResponse(userMessage, onChunk) {
//   const apiKey = process.env.OPENAI_API_KEY;

//   if (!apiKey) throw new Error("Missing OPENAI_API_KEY in environment variables");

//   // OpenAI Chat Completions endpoint
//   const response = await fetch("https://api.openai.com/v1/chat/completions", {
//     method: "POST",
//     headers: {
//       "Authorization": `Bearer ${apiKey}`,
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({
//       model: "gpt-3.5-turbo", // you can change to gpt-4-turbo if your key supports it
//       stream: true,
//       messages: [
//         { role: "system", content: "You are a helpful AI assistant." },
//         { role: "user", content: userMessage },
//       ],
//     }),
//   });

//   if (!response.ok) {
//     const err = await response.text();
//     throw new Error(`OpenAI API error: ${err}`);
//   }

//   const reader = response.body.getReader();
//   const decoder = new TextDecoder("utf-8");

//   while (true) {
//     const { done, value } = await reader.read();
//     if (done) break;

//     const chunk = decoder.decode(value);
//     const lines = chunk.split("\n").filter((line) => line.trim() !== "");

//     for (const line of lines) {
//       if (line.startsWith("data: ")) {
//         const data = line.replace("data: ", "");
//         if (data === "[DONE]") return;

//         try {
//           const json = JSON.parse(data);
//           const content = json.choices?.[0]?.delta?.content;
//           if (content) onChunk(content);
//         } catch (e) {
//           console.error("OpenAI stream parse error", e);
//         }
//       }
//     }
//   }
// }


export async function streamLLMResponse(userMessage, onChunk) {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) throw new Error("Missing GROQ_API_KEY in environment variables");

    // Groq's OpenAI-compatible endpoint
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: "llama-3.3-70b-versatile", // updated to a supported model
            stream: true,
            messages: [
                { role: "system", content: "You are a helpful AI assistant." },
                { role: "user", content: userMessage },
            ],
        }),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Groq API error: ${err}`);
    }

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
                    console.error("Groq stream parse error", e);
                }
            }
        }
    }
}
