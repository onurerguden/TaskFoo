import { useEffect, useRef, useState } from "react";

type BotAPIItem = {
  text?: string;
  image?: string;
  buttons?: { title: string; payload: string }[];
  custom?: any;
};


const BOT_URL = import.meta.env.VITE_BOT_URL || "http://localhost:5005";

type Msg = { from: "user" | "bot"; text: string };

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { from: "bot", text: "Hi! I’m the TaskFoo assistant. How can I help?" },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ 
      top: scrollerRef.current.scrollHeight,
      behavior: 'smooth'
    });
  }, [messages, open]);

  async function send() {
    const text = input.trim();
    if (!text) return;
    setMessages((m) => [...m, { from: "user", text }]);
    setInput("");
    setIsTyping(true);

    try {
      const payload: any = { sender: "onur", message: text };
      const jwt = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");
      if (jwt) payload.metadata = { jwt };
      const res = await fetch(`${BOT_URL}/webhooks/rest/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      
      // Bot yanıtını geciktirerek yazıyor hissi ver
      setTimeout(() => {
        const apiItems: BotAPIItem[] = Array.isArray(data) ? data : [];

        // trigger any frontend actions (navigation etc.)

        const botMsgs: Msg[] = [];
        apiItems.forEach((d) => {
          if (d.text) botMsgs.push({ from: "bot", text: d.text });
          if (d.image) botMsgs.push({ from: "bot", text: `![image](${d.image})` });
          if (d.buttons && d.buttons.length) {
            const hints = d.buttons.map((b) => `• ${b.title}`).join("\n");
            botMsgs.push({ from: "bot", text: `Suggestions:\n${hints}` });
          }
        });

        setMessages((m) => [...m, ...botMsgs]);
        setIsTyping(false);
      }, 1200);
    } catch (e: any) {
      setTimeout(() => {
        setMessages((m) => [...m, { from: "bot", text: "Connection error. Is the bot running? 🔧" }]);
        setIsTyping(false);
      }, 1000);
    }
  }

  return (
    <>
      {/* Toggle Button */}
      <button
        aria-label="Open chat"
        onClick={() => setOpen((v) => !v)}
        className="chat-toggle-btn"
        style={{
          position: "fixed",
          right: 24,
          bottom: 24,
          width: 60,
          height: 60,
          borderRadius: "50%",
          border: "none",
          background: "#3092B9",
          cursor: "pointer",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: open ? "28px" : "24px",
          color: "white",
          boxShadow: "0 10px 32px rgba(48, 146, 185, 0.35)",
          transition: "all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
          transform: open ? "rotate(135deg) scale(1.1)" : "rotate(0deg) scale(1)",
        }}
      >
        {open ? (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15a4 4 0 0 1-4 4H8l-5 5 1.5-5H5a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4z"/>
          </svg>
        )}
      </button>

      {/* Chat Panel */}
      <div
        className={`chat-panel ${open ? 'open' : 'closed'}`}
        style={{
          position: "fixed",
          right: 24,
          bottom: 80,
          width: 440,
          height: 680,
          maxWidth: "calc(100vw - 48px)",
          maxHeight: "calc(100vh - 140px)",
          display: "flex",
          flexDirection: "column",
          background: "#ffffff",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(48, 146, 185, 0.18)",
          borderRadius: 24,
          boxShadow: "0 24px 68px rgba(6, 43, 67, 0.18)",
          overflow: "hidden",
          zIndex: 9998,
          transform: open ? "translateY(0) scale(1)" : "translateY(20px) scale(0.95)",
          opacity: open ? 1 : 0,
          visibility: open ? "visible" : "hidden",
          transition: "transform 420ms cubic-bezier(0.22, 1, 0.36, 1), opacity 240ms ease, visibility 0s linear 140ms",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            background: "#062B43",
            color: "white",
            fontWeight: 600,
            fontSize: "18px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "#10b981",
              boxShadow: "0 0 8px rgba(16, 185, 129, 0.5)",
              animation: "pulse 2s infinite",
            }}
          />
          TaskFoo Assistant
        </div>

        {/* Messages */}
        <div
          ref={scrollerRef}
          style={{
            flex: 1,
            padding: "24px",
            overflowY: "auto",
            background: "#f5f7fa",
            scrollbarWidth: "thin",
            scrollbarColor: "#cbd5e1 transparent",
          }}
        >
          {messages.map((m, i) => (
            <div 
              key={i} 
              style={{ 
                display: "flex",
                justifyContent: m.from === "user" ? "flex-end" : "flex-start",
                margin: "16px 0",
                animation: `slideIn 0.5s ease-out ${i * 0.1}s backwards`
              }}
            >
              <div
                style={{
                  maxWidth: "85%",
                  padding: "14px 18px",
                  borderRadius: m.from === "user" ? "20px 20px 4px 20px" : "20px 20px 20px 4px",
                  background: m.from === "user" 
                    ? "#3092B9"
                    : "white",
                  color: m.from === "user" ? "white" : "#1f2937",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  boxShadow: m.from === "user" 
                    ? "0 8px 24px rgba(59, 130, 246, 0.2)" 
                    : "0 4px 16px rgba(0, 0, 0, 0.08)",
                  border: m.from === "bot" ? "1px solid rgba(59, 130, 246, 0.1)" : "none",
                  fontSize: "15px",
                  lineHeight: "1.5",
                }}
              >
                {m.text.startsWith("![image](") ? (
                  <img src={m.text.slice(9, -1)} alt="bot" style={{ maxWidth: "100%", borderRadius: 12 }} />
                ) : (
                  m.text
                )}
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div style={{ display: "flex", justifyContent: "flex-start", margin: "16px 0" }}>
              <div
                style={{
                  padding: "14px 18px",
                  borderRadius: "20px 20px 20px 4px",
                  background: "white",
                  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
                  border: "1px solid rgba(59, 130, 246, 0.1)",
                }}
              >
                <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                  <div className="typing-dot" style={{ animationDelay: "0s" }} />
                  <div className="typing-dot" style={{ animationDelay: "0.2s" }} />
                  <div className="typing-dot" style={{ animationDelay: "0.4s" }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div 
          style={{ 
            padding: "24px", 
            background: "white",
            borderTop: "1px solid rgba(59, 130, 246, 0.1)",
          }}
        >
          <div style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Type your message..."
              style={{
                flex: 1,
                padding: "14px 18px",
                borderRadius: 16,
                border: "2px solid rgba(59, 130, 246, 0.1)",
                outline: "none",
                fontSize: "15px",
                background: "#f8fafc",
                transition: "all 0.2s ease",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#3092B9";
                e.target.style.background = "white";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(59, 130, 246, 0.1)";
                e.target.style.background = "#f8fafc";
              }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || isTyping}
              style={{
                padding: "14px 18px",
                borderRadius: 16,
                border: "none",
                background: input.trim() && !isTyping 
                  ? "#3092B9" 
                  : "#cbd5e1",
                color: "white",
                cursor: input.trim() && !isTyping ? "pointer" : "not-allowed",
                fontWeight: 600,
                fontSize: "15px",
                transition: "all 0.2s ease",
                transform: input.trim() && !isTyping ? "scale(1)" : "scale(0.95)",
              }}
            >
              {isTyping ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M6 2h12v6H6z"/>
                  <path d="M6 22h12v-6H6z"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M22 2L11 13"/>
                  <path d="M22 2l-7 20-4-9-9-4 20-7z"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .typing-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #93a9b6;
          animation: typingBounce 1.4s ease-in-out infinite.
        }

        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-10px); }
        }

        .chat-toggle-btn:hover {
          box-shadow: 0 12px 40px rgba(48, 146, 185, 0.4) !important;
          transform: rotate(0deg) scale(1.1) !important;
        }

        .chat-toggle-btn:active {
          transform: rotate(0deg) scale(1.05) !important;
        }

        .chat-panel::-webkit-scrollbar {
          width: 6px;
        }

        .chat-panel::-webkit-scrollbar-track {
          background: transparent.
        }

        .chat-panel::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }

        .chat-panel::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        /* subtle pop for opening */
        .chat-panel.open { will-change: transform, opacity; }
      `}</style>
    </>
  );

  //train more 
  //add image support
  //add instructions
  //add buttons
  //improve UI
}