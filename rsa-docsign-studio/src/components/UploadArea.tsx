import { useRef } from "react";
import { Button } from "./ui/button";

interface UploadAreaProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export function UploadArea({ onFile, disabled }: UploadAreaProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold">Upload a document</div>
          <div className="text-xs opacity-70">
            PDF, images, or any file. We'll hash and optionally encrypt.
            {disabled && <span className="ml-2 text-yellow-300">Generating keys…</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
            }}
          />
          <Button disabled={disabled} onClick={() => inputRef.current?.click()}>
            {disabled ? 'Preparing…' : 'Choose File'}
          </Button>
        </div>
      </div>
    </div>
  );
}

