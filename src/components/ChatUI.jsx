// src/components/ChatUI.jsx
'use client';

import React, { useState, useEffect, useRef } from "react";
import { initSocket } from "@/utils/socket";
import "../app/globals.css";
import ReactMarkdown from "react-markdown";

export default function ChatUI() {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]); // { sender: 'user' | 'ai', text: '' }
  const [input, setInput] = useState("");
  const [isAIResponding, setIsAIResponding] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef(null);

  const [selectedModel, setSelectedModel] = useState("groq");

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 💾 Save messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("chatMessages", JSON.stringify(messages));
  }, [messages]);

  // 💾 Load messages from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("chatMessages");
    if (saved) setMessages(JSON.parse(saved));
  }, []);


  // Initialize WebSocket
  useEffect(() => {
    const s = initSocket();

    s.on("connect", () => {
      setIsConnected(true);
    });

    s.on("disconnect", () => {
      setIsConnected(false);
    });

    s.on("ai_message_chunk", (chunk) => {
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];

        if (last && last.sender === "ai") {
          last.text += chunk;
          return [...updated];
        } else {
          return [...updated, { sender: "ai", text: chunk }];
        }
      });
    });

    s.on("ai_message_done", () => {
      setIsAIResponding(false);
    });

    s.on("ai_message_error", (err) => {
      setIsAIResponding(false);
      alert("AI Error: " + err);
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  const handleSend = () => {
    if (!input.trim() || !socket || isAIResponding) return;

    const userMessage = input.trim();
    setMessages((prev) => [...prev, { sender: "user", text: userMessage }]);
    setInput("");
    setIsAIResponding(true);

    socket.emit("user_message", { text: userMessage, model: selectedModel });
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleSend();
  };

  return (
    <div className="chat-container">
      <header className="chat-header">
        <div className="header-left">
          <h2>💬 Real-Time AI Chatbot</h2>
        </div>

        <div className="header-right">
          <select
            value={selectedModel}
            // onChange={(e) => setSelectedModel(e.target.value)}
            onChange={(e) => {
              const newModel = e.target.value;
              setSelectedModel(newModel);
              // Clear chat when model changes
              setMessages([]);
              localStorage.removeItem("chatMessages");
            }}
            className="model-dropdown"
          >
            <option value="groq">Groq (LLaMA 3.3)</option>
            {/* <option value="openai">OpenAI (GPT-3.5-Turbo)</option> */}
            <option value="gemini">Gemini (Google)</option>
          </select>

          <span className={`status-dot ${isConnected ? "connected" : "disconnected"}`}>
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </header>


      <div className="chat-actions">
        <button
          onClick={() => {
            setMessages([]);
            localStorage.removeItem("chatMessages"); // also clear persisted chat
          }}
          className="clear-btn"
        >
          🧹 Clear Chat
        </button>
      </div>


      <div className="chat-messages">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`message ${msg.sender === "user" ? "user" : "ai"}`}
          >
            <div className="message-header">
              {msg.sender === "ai" && (
                <button
                  className="copy-btn "
                  onClick={() => {
                    navigator.clipboard.writeText(msg.text);
                  }}
                >
                  Copy Chat 📋
                </button>
              )}
            </div>

            <div className="message-text markdown">
              <ReactMarkdown>{msg.text}</ReactMarkdown>
            </div>

            <div className="timestamp">
              {new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>

        ))}
        {isAIResponding && (
          <div className="typing">AI is typing<span className="dots">...</span></div>
        )}
        <div ref={messagesEndRef}></div>
      </div>

      <div className="chat-input">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Type your message..."
          disabled={isAIResponding}
          maxLength={500}
        />
        <button onClick={handleSend} disabled={!input.trim() || isAIResponding}>
          Send
        </button>
      </div>
    </div>
  );
}
