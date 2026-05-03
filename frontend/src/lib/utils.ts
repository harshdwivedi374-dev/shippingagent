import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(date));
}

export function getStatusColor(status: string) {
  const map: Record<string, string> = {
    draft:             "bg-slate-100 text-slate-600",
    pending_agent:     "bg-amber-100 text-amber-700",
    agent_processing:  "bg-blue-100 text-blue-700",
    awaiting_approval: "bg-orange-100 text-orange-700",
    label_created:     "bg-cyan-100 text-cyan-700",
    picked_up:         "bg-indigo-100 text-indigo-700",
    in_transit:        "bg-blue-100 text-blue-700",
    out_for_delivery:  "bg-purple-100 text-purple-700",
    delivered:         "bg-green-100 text-green-700",
    exception:         "bg-red-100 text-red-700",
    rerouted:          "bg-yellow-100 text-yellow-700",
    cancelled:         "bg-slate-100 text-slate-500",
    returned:          "bg-red-100 text-red-600",
  };
  return map[status] || "bg-slate-100 text-slate-600";
}

export function getStatusDot(status: string) {
  const map: Record<string, string> = {
    delivered:         "bg-green-500",
    in_transit:        "bg-blue-500",
    exception:         "bg-red-500",
    awaiting_approval: "bg-orange-500",
    label_created:     "bg-cyan-500",
    picked_up:         "bg-indigo-500",
    out_for_delivery:  "bg-purple-500",
  };
  return map[status] || "bg-slate-400";
}

export function getConfidenceColor(score: number) {
  if (score >= 0.95) return "text-green-600";
  if (score >= 0.70) return "text-amber-600";
  return "text-red-500";
}

export function getConfidenceLabel(score: number) {
  if (score >= 0.95) return "Auto-Execute";
  if (score >= 0.70) return "Needs Review";
  return "Rejected";
}
