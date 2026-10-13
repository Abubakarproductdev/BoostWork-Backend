import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const DEFAULT_API_BASE = "https://boostworks-hzfxbjh2ebfsfcfx.uaenorth-01.azurewebsites.net";

// The Azure backend is used in both dev and production. Set VITE_API_BASE to point
// somewhere else (e.g. http://localhost:5000 for a local backend). Trailing slashes are stripped.
export const API_BASE = (import.meta.env.VITE_API_BASE?.trim() || DEFAULT_API_BASE).replace(/\/+$/, "");
