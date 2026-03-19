import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const defaultApiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "https://localhost:7000").replace(/\/$/, "");

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(input?: string | null, format: "dd-MM-yyyy" | "dd/MM/yyyy" | "default" = "default") {
  if (!input) return "";
  const date = new Date(input);
  if (Number.isNaN(date.getTime()) || date.getFullYear() <= 1) return "";
  if (format === "dd-MM-yyyy" || format === "dd/MM/yyyy") {
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    const sep = format === "dd/MM/yyyy" ? "/" : "-";
    return `${dd}${sep}${mm}${sep}${yyyy}`;
  }
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function buildImageUrl(path?: string, baseUrl: string = defaultApiBaseUrl) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const normalizedBase = baseUrl.replace(/\/$/, "");
  return `${normalizedBase}${path.startsWith("/") ? path : `/${path}`}`;
}
