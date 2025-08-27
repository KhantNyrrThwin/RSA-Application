import { twMerge } from "tailwind-merge";

export function cn(
  ...inputs: Array<string | undefined | null | false>
): string {
  return twMerge(inputs.filter(Boolean).join(" "));
}

export async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const arr = new Uint8Array(digest);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

