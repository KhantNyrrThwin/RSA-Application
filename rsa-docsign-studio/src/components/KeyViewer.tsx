import { useEffect, useState } from "react";
import { Button } from "./ui/button";

function prettyPrintJwk(jwk?: JsonWebKey) {
  if (!jwk) return "Generating...";
  return JSON.stringify(jwk, Object.keys(jwk).sort(), 2);
}

interface KeyViewerProps {
  title: string;
  publicJwk?: JsonWebKey;
  privateJwk?: JsonWebKey;
}

export function KeyViewer({ title, publicJwk, privateJwk }: KeyViewerProps) {
  const [showPriv, setShowPriv] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(null), 1200);
    return () => clearTimeout(t);
  }, [copied]);

  const copy = async (text: string, which: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(which);
  };

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-slate-100">
      <div className="mb-2 flex items-center justify-between">
        <div className="font-semibold">{title}</div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowPriv((s) => !s)}>
            {showPriv ? "Hide Private" : "Show Private"}
          </Button>
        </div>
      </div>
      <div className="mb-3">
        <div className="text-xs mb-1 opacity-80">Public Key (JWK)</div>
        <pre className="text-xs bg-slate-800/70 p-2 rounded border border-slate-700 overflow-auto">
{prettyPrintJwk(publicJwk)}
        </pre>
        <Button size="sm" variant="ghost" onClick={() => copy(prettyPrintJwk(publicJwk), "pub")}>
          {copied === "pub" ? "Copied" : "Copy Public"}
        </Button>
      </div>
      {showPriv && (
        <div>
          <div className="text-xs mb-1 opacity-80">Private Key (JWK)</div>
          <pre className="text-xs bg-slate-800/70 p-2 rounded border border-slate-700 overflow-auto">
{prettyPrintJwk(privateJwk)}
          </pre>
          <Button size="sm" variant="ghost" onClick={() => copy(prettyPrintJwk(privateJwk), "priv")}>
            {copied === "priv" ? "Copied" : "Copy Private"}
          </Button>
        </div>
      )}
    </div>
  );
}

