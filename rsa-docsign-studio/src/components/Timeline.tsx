import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./ui/button";

export interface DocEvent {
  id: string;
  filename: string;
  size: number;
  sha256: string;
  signature?: string;
  ciphertext?: string; // AES-GCM ciphertext (base64)
  iv?: string; // AES-GCM IV (base64)
  wrappedKey?: string; // RSA-OAEP wrapped AES key (base64)
  decryptedOk?: boolean;
  authentic?: boolean;
  tampered?: boolean;
  createdAt: number;
}

interface TimelineProps {
  events: DocEvent[];
  onVerify?: (id: string) => void;
  onDecrypt?: (id: string) => void;
  showHash?: boolean;
  showSignature?: boolean;
  showCiphertext?: boolean;
  showIv?: boolean;
  showWrappedKey?: boolean;
  actions?: boolean;
}

export function Timeline({ events, onVerify, onDecrypt, showHash = true, showSignature = true, showCiphertext = true, showIv = true, showWrappedKey = true, actions = true }: TimelineProps) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4 h-[60vh] overflow-y-auto">
      <AnimatePresence initial={false}>
        {events.map((e) => (
          <motion.div key={e.id} layout className="mb-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{e.filename}</div>
                <div className="text-xs opacity-70">{(e.size / 1024).toFixed(2)} KB • {new Date(e.createdAt).toLocaleTimeString()}</div>
              </div>
              {actions && (
                <div className="flex items-center gap-2">
                  {onDecrypt && e.ciphertext && (
                    <Button size="sm" onClick={() => onDecrypt(e.id)}>Decrypt</Button>
                  )}
                  {onVerify && (
                    <Button size="sm" variant="outline" onClick={() => onVerify(e.id)}>Verify Signature</Button>
                  )}
                </div>
              )}
            </div>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
              {showHash && (
                <div>
                  <div className="text-xs opacity-70 mb-1">SHA-256</div>
                  <pre className="text-xs bg-slate-800/70 p-2 rounded border border-slate-700 overflow-auto">{e.sha256}</pre>
                </div>
              )}
              {showSignature && e.signature && (
                <div>
                  <div className="text-xs opacity-70 mb-1">Signature (base64)</div>
                  <pre className="text-xs bg-slate-800/70 p-2 rounded border border-slate-700 overflow-auto">{e.signature}</pre>
                </div>
              )}
              {showCiphertext && e.ciphertext && (
                <div className="md:col-span-2">
                  <div className="text-xs opacity-70 mb-1">Ciphertext (base64)</div>
                  <pre className="text-xs bg-yellow-900/30 text-yellow-200 p-2 rounded border border-yellow-700/50 overflow-auto">{e.ciphertext}</pre>
                </div>
              )}
              {showIv && e.iv && (
                <div>
                  <div className="text-xs opacity-70 mb-1">AES-GCM IV (base64)</div>
                  <pre className="text-xs bg-slate-800/70 p-2 rounded border border-slate-700 overflow-auto">{e.iv}</pre>
                </div>
              )}
              {showWrappedKey && e.wrappedKey && (
                <div>
                  <div className="text-xs opacity-70 mb-1">Wrapped AES Key (RSA-OAEP, base64)</div>
                  <pre className="text-xs bg-slate-800/70 p-2 rounded border border-slate-700 overflow-auto">{e.wrappedKey}</pre>
                </div>
              )}
            </div>
            <div className="mt-2">
              {typeof e.authentic !== 'undefined' && (
                <div className={e.authentic ? "text-green-400" : "text-red-400"}>
                  {e.authentic ? "✅ Authentic" : "❌ Forged"}
                </div>
              )}
              {e.tampered && <div className="text-yellow-400">⚠️ Tampered</div>}
            </div>
            <div className="h-px bg-slate-700/50 my-3" />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

