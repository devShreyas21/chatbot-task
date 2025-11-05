'use client';

import React, { useState, useEffect, useRef } from "react";
import { initSocket } from "@/utils/socket";
import "../app/globals.css";
import ReactMarkdown from "react-markdown";

export default function ChatUI() {
  const [socket, setSocket] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [input, setInput] = useState("");
  const [isAIResponding, setIsAIResponding] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedModel, setSelectedModel] = useState("groq");
  const messagesEndRef = useRef(null);
  const activeSessionRef = useRef(null);

  // ✅ Load chat sessions or create first one
  useEffect(() => {
    if (typeof window === "undefined") return;

    const saved = localStorage.getItem("chatSessions");
    if (saved) {
      const parsed = JSON.parse(saved);
      setSessions(parsed);
      setActiveSession(parsed[0] || null);
      activeSessionRef.current = parsed[0] || null;
    } else {
      const firstSession = {
        id: Date.now(),
        title: "Chat 1",
        messages: [],
      };
      setSessions([firstSession]);
      setActiveSession(firstSession);
      activeSessionRef.current = firstSession;
    }
  }, []);

  // ✅ Keep ref in sync
  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  // ✅ Save sessions to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("chatSessions", JSON.stringify(sessions));
  }, [sessions]);

  // ✅ Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages]);

  // ✅ Initialize socket once
  useEffect(() => {
    const s = initSocket();

    s.on("connect", () => setIsConnected(true));
    s.on("disconnect", () => setIsConnected(false));

    // ✅ Update both sessions + active session immediately
    s.on("ai_message_chunk", (chunk) => {
      setSessions((prev) => {
        const updatedSessions = prev.map((sess) => {
          if (sess.id === activeSessionRef.current?.id) {
            const updated = [...sess.messages];
            const last = updated[updated.length - 1];
            if (last && last.sender === "ai") {
              last.text += chunk;
            } else {
              updated.push({ sender: "ai", text: chunk });
            }

            // update both session and active state
            const newSession = { ...sess, messages: updated };
            activeSessionRef.current = newSession;
            setActiveSession(newSession);

            return newSession;
          }
          return sess;
        });
        return updatedSessions;
      });
    });

    s.on("ai_message_done", () => setIsAIResponding(false));

    s.on("ai_message_error", (err) => {
      setIsAIResponding(false);
      alert("AI Error: " + err);
    });

    setSocket(s);
    return () => s.disconnect();
  }, []);

  // ✅ Send message
  const handleSend = () => {
    if (!input.trim() || !socket || isAIResponding) return;

    let session = activeSessionRef.current;
    if (!session) return;

    const userMessage = input.trim();
    const updatedSession = {
      ...session,
      messages: [...(session.messages || []), { sender: "user", text: userMessage }],
    };

    setSessions((prev) => prev.map((s) => (s.id === session.id ? updatedSession : s)));
    setActiveSession(updatedSession);
    activeSessionRef.current = updatedSession;

    setInput("");
    setIsAIResponding(true);

    // ✅ Emit to backend
    socket.emit("user_message", { text: userMessage, model: selectedModel });
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleSend();
  };

  // ✅ Clear only current chat
  const clearChat = () => {
    if (!activeSession) return;
    const cleared = { ...activeSession, messages: [] };
    setSessions((prev) => prev.map((s) => (s.id === activeSession.id ? cleared : s)));
    setActiveSession(cleared);
    activeSessionRef.current = cleared;
  };

  // ✅ Clear all sessions
  const clearAll = () => {
    if (typeof window !== "undefined") localStorage.removeItem("chatSessions");
    const freshSession = { id: Date.now(), title: "Chat 1", messages: [] };
    setSessions([freshSession]);
    setActiveSession(freshSession);
    activeSessionRef.current = freshSession;
  };

  // ✅ Create new session
  const createNewSession = () => {
    const newSession = {
      id: Date.now(),
      title: `Chat ${sessions.length + 1}`,
      messages: [],
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSession(newSession);
    activeSessionRef.current = newSession;
  };

  // ✅ Switch session
  const switchSession = (session) => {
    setActiveSession(session);
    activeSessionRef.current = session;
  };

  return (
    <div className="chat-layout">
      {/* Sidebar */}
      <aside className="chat-sidebar">
        <div className="sidebar-header">
          <h3>🗂️ Chat History</h3>
          <button onClick={createNewSession} className="new-chat-btn">
            ➕ New
          </button>
        </div>
        <div className="session-list">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`session-item ${
                session.id === activeSession?.id ? "active" : ""
              }`}
              onClick={() => switchSession(session)}
            >
              {session.title}
            </div>
          ))}
        </div>
        <button onClick={clearAll} className="clear-all-btn">
          🧹 Clear All
        </button>
      </aside>

      {/* Chat Area */}
      <div className="chat-container">
        <header className="chat-header">
          <div className="header-left">
            <h2>{activeSession?.title || "💬 Real-Time AI Chatbot"}</h2>
          </div>

          <div className="header-right">
            <select
              value={selectedModel}
              onChange={(e) => {
                setSelectedModel(e.target.value);
                clearChat();
              }}
              className="model-dropdown"
            >
              <option value="groq">Groq (LLaMA 3.3)</option>
              <option value="gemini">Gemini (Google)</option>
            </select>

            <span
              className={`status-dot ${
                isConnected ? "connected" : "disconnected"
              }`}
            >
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </header>

        <div className="chat-actions">
          <button onClick={clearChat} className="clear-btn">
            🧹 Clear Chat
          </button>
        </div>

        <div className="chat-messages">
          {activeSession?.messages?.map((msg, idx) => (
            <div
              key={idx}
              className={`message ${msg.sender === "user" ? "user" : "ai"}`}
            >
              <div className="message-header">
                {msg.sender === "ai" && (
                  <button
                    className="copy-btn"
                    onClick={() => navigator.clipboard.writeText(msg.text)}
                  >
                    📋 Copy
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
            <div className="typing">
              AI is typing<span className="dots">...</span>
            </div>
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
          <button
            onClick={handleSend}
            disabled={!input.trim() || isAIResponding}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
