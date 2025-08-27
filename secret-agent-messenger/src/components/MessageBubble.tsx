import { motion } from "framer-motion";
import { cn } from "../lib/utils";

export type Sender = "Alice" | "Bob" | "Eve" | "Cipher";

interface MessageBubbleProps {
  sender: Sender;
  text: string;
  isCipher?: boolean;
  timestamp?: string;
}

export function MessageBubble({ sender, text, isCipher, timestamp }: MessageBubbleProps) {
  const colorMap: Record<Sender, string> = {
    Alice: "bg-green-700/60 text-green-50",
    Bob: "bg-blue-700/60 text-blue-50",
    Eve: "bg-red-700/60 text-red-50",
    Cipher: "bg-yellow-600/20 text-yellow-200 border border-yellow-500/40 font-mono",
  };

  const align = sender === "Bob" ? "items-end" : "items-start";

  return (
    <div className={cn("w-full flex", align)}>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: isCipher ? 0.9 : 1 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 240, damping: 18 }}
        className={cn(
          "max-w-[80%] rounded-lg px-4 py-2 shadow-lg backdrop-blur",
          colorMap[isCipher ? "Cipher" : sender]
        )}
      >
        <div className="text-xs opacity-70 mb-1">{sender}{timestamp ? ` • ${timestamp}` : ""}</div>
        <div className={cn(isCipher && "whitespace-pre-wrap break-words")}>{text}</div>
      </motion.div>
    </div>
  );
}

