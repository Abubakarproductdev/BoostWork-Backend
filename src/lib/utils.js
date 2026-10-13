import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const PRODUCTION_API_BASE = "https://upworkproposalmaker-azbuf5gqbdanfbhh.centralindia-01.azurewebsites.net";

export const API_BASE = import.meta.env.VITE_API_BASE ?? (import.meta.env.DEV ? "" : PRODUCTION_API_BASE);
