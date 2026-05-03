"use client";
import { useStore } from "@/store/useStore";
import { Bell, Search } from "lucide-react";

export default function TopBar({ title }: { title: string }) {
  const { agentThinking, agentCurrentStep, pendingEscalations } = useStore();

  return (
    <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0 shadow-sm">
      <div className="flex items-center gap-4">
        <h1 className="text-base font-semibold text-slate-800">{title}</h1>
        {agentThinking && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-3 py-1">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-xs text-blue-600 font-medium">Agent: {agentCurrentStep || "thinking..."}</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Search shipments..."
            className="bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 w-52 transition-colors"
          />
        </div>
        <button className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors">
          <Bell size={18} />
          {pendingEscalations > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
              {pendingEscalations}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
