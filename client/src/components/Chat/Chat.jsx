/* eslint-disable no-unused-vars */
import { useEffect, useRef, useState } from "react";

export default function Chat({ messages, onSend, isDrawer, playerName }) {
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput("");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b border-gray-800">
        <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Chat & Guesses</p>
      </div>
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
        {messages.map((msg, i) => (
          <div key={i} className={`text-sm rounded-lg px-2 py-1 ${
            msg.type === "correct" ? "bg-green-900/50 text-green-400" :
            msg.type === "system" ? "bg-gray-800 text-gray-400 italic" :
            "text-white"
          }`}>
            {msg.type !== "system" && (
              <span className="text-yellow-400 font-bold">{msg.senderName}: </span>
            )}
            {msg.message}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="p-2 border-t border-gray-800 flex gap-2">
        <input
          className="flex-1 bg-gray-800 rounded-xl px-3 py-2 text-white text-sm placeholder-gray-500 outline-none focus:ring-1 focus:ring-yellow-400"
          placeholder={isDrawer ? "Can't chat while drawing!" : "Type your guess..."}
          value={input}
          disabled={isDrawer}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <button
          onClick={handleSend}
          disabled={isDrawer}
          className="bg-yellow-400 disabled:opacity-30 text-gray-950 font-bold px-3 py-2 rounded-xl text-sm"
        >
          ➤
        </button>
      </div>
    </div>
  );
}