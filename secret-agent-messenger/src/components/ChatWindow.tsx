import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageBubble } from "./MessageBubble";
import { Button } from "./ui/button";

export interface ChatMessage {
  id: string;
  sender: "Alice" | "Bob" | "Eve";
  ciphertext: string;
  plaintext?: string;
  signature?: string;
  authentic?: boolean;
  tampered?: boolean;
  timestamp: number;
}

interface ChatWindowProps {
  messages: ChatMessage[];
  onDecrypt: (id: string) => void;
}

export function ChatWindow({ messages, onDecrypt }: ChatWindowProps) {
  const sorted = useMemo(() => [...messages].sort((a, b) => a.timestamp - b.timestamp), [messages]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4 h-[60vh] overflow-y-auto">
      <AnimatePresence initial={false}>
        {sorted.map((m) => (
          <motion.div key={m.id} layout className="mb-3">
            <MessageBubble sender="Alice" text={"Alice → Bob"} timestamp={new Date(m.timestamp).toLocaleTimeString()} />
            <div className="my-1" />
            <MessageBubble sender="Cipher" text={m.ciphertext} isCipher />
            <div className="mt-2 flex items-center gap-2">
              <Button size="sm" onClick={() => onDecrypt(m.id)}>Decrypt (Bob)</Button>
              {typeof m.authentic !== "undefined" && (
                <div className={m.authentic ? "text-green-400" : "text-red-400"}>
                  {m.authentic ? "✅ Authentic" : "❌ Forged"}
                </div>
              )}
              {m.tampered && <div className="text-yellow-400">⚠️ Tampered</div>}
              {m.plaintext && (
                <Button size="sm" variant="ghost" onClick={() => setExpanded((e) => ({ ...e, [m.id]: !e[m.id] }))}>
                  {expanded[m.id] ? "Hide" : "Show"} Plaintext
                </Button>
              )}
            </div>
            {m.plaintext && expanded[m.id] && (
              <div className="mt-2">
                <MessageBubble sender="Bob" text={m.plaintext} />
              </div>
            )}
            <div className="h-px bg-slate-700/50 my-3" />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

