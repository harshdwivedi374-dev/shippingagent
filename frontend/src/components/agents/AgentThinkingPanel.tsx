"use client";
import { cn, getConfidenceColor, getConfidenceLabel } from "@/lib/utils";
import { Bot, CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface DecisionLog {
  agent: string;
  action: string;
  confidence: number;
  disposition: string;
  reasoning: string;
}

interface Props {
  logs: DecisionLog[];
  overallConfidence?: number;
  disposition?: string;
  isThinking?: boolean;
}

const agentColors: Record<string, string> = {
  ComplianceAgent: "text-purple-400 bg-purple-900/30 border-purple-700",
  RouterAgent: "text-blue-400 bg-blue-900/30 border-blue-700",
  NegotiatorAgent: "text-yellow-400 bg-yellow-900/30 border-yellow-700",
  ExceptionAgent: "text-red-400 bg-red-900/30 border-red-700",
};

const agentIcons: Record<string, string> = {
  ComplianceAgent: "📋",
  RouterAgent: "🗺️",
  NegotiatorAgent: "💰",
  ExceptionAgent: "🚨",
};

export default function AgentThinkingPanel({ logs, overallConfidence, disposition, isThinking }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Bot size={16} className="text-blue-400" />
          <span className="text-sm font-semibold text-slate-900">Agent Chain of Thought</span>
          {isThinking && <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />}
        </div>
        {overallConfidence !== undefined && (
          <div className="flex items-center gap-2">
            <span className={cn("text-sm font-bold", getConfidenceColor(overallConfidence))}>
              {(overallConfidence * 100).toFixed(0)}%
            </span>
            <span className={cn("text-xs px-2 py-0.5 rounded-full border",
              disposition === "auto_execute" ? "text-green-400 bg-green-900/30 border-green-700" :
              disposition === "escalate_to_human" ? "text-yellow-400 bg-yellow-900/30 border-yellow-700" :
              "text-red-400 bg-red-900/30 border-red-700"
            )}>
              {disposition === "auto_execute" ? "Auto-Executed" :
               disposition === "escalate_to_human" ? "Needs Review" : "Rejected"}
            </span>
          </div>
        )}
      </div>

      {/* Steps */}
      <div className="p-4 space-y-3">
        {isThinking && logs.length === 0 && (
          <div className="flex items-center gap-3 text-slate-500 text-sm">
            <div className="flex gap-1">
              {[0,1,2].map(i => (
                <span key={i} className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
            Agents are processing your shipment...
          </div>
        )}

        {logs.map((log, i) => (
          <div key={i} className={cn("rounded-lg border p-3 cursor-pointer transition-colors",
            agentColors[log.agent] || "text-slate-500 bg-slate-100 border-slate-300"
          )} onClick={() => setExpanded(expanded === i ? null : i)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">{agentIcons[log.agent] || "🤖"}</span>
                <div>
                  <p className="text-xs font-semibold">{log.agent}</p>
                  <p className="text-xs opacity-70 capitalize">{log.action.replace(/_/g, " ")}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold">{(log.confidence * 100).toFixed(0)}%</span>
                {log.disposition === "auto_execute" ? <CheckCircle size={14} className="text-green-400" /> :
                 log.disposition === "escalate_to_human" ? <AlertTriangle size={14} className="text-yellow-400" /> :
                 <XCircle size={14} className="text-red-400" />}
                {expanded === i ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </div>
            {expanded === i && (
              <div className="mt-3 pt-3 border-t border-current/20">
                <p className="text-xs opacity-80 leading-relaxed">{log.reasoning}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
