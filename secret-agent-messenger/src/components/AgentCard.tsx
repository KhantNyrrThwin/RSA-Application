import { cn } from "../lib/utils";
import { Button } from "./ui/button";

interface AgentCardProps {
  name: "Alice" | "Bob" | "Eve";
  emoji: string;
  subtitle?: string;
  onShowKeys?: () => void;
}

export function AgentCard({ name, emoji, subtitle, onShowKeys }: AgentCardProps) {
  return (
    <div className={cn(
      "rounded-xl border border-slate-700 bg-slate-900/60 p-4 backdrop-blur shadow"
    )}>
      <div className="flex items-center gap-3">
        <div className="text-3xl">{emoji}</div>
        <div>
          <div className="text-lg font-semibold">{name}</div>
          {subtitle && <div className="text-xs text-slate-300">{subtitle}</div>}
        </div>
        <div className="ml-auto">
          {onShowKeys && (
            <Button variant="outline" size="sm" onClick={onShowKeys}>Show Keys</Button>
          )}
        </div>
      </div>
    </div>
  );
}

