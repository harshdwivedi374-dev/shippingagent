"use client";
import { useState, useRef, useEffect } from "react";
import { agentsApi, shipmentsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Send, Bot, User, Loader2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  data?: any;
  timestamp: Date;
}

const QUICK_PROMPTS = [
  "Check compliance for electronics from US to DE",
  "Get rate quotes for 5kg package NYC to London",
  "Calculate carbon footprint for air freight US to CN",
  "Find green routes for 10kg US to AU under $100",
];

export default function AgentChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm your Agentic Shipping AI. I can check compliance, get rate quotes, handle exceptions, and optimize your shipping routes. What would you like to do?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg) return;

    setInput("");
    setMessages(prev => [...prev, { role: "user", content: msg, timestamp: new Date() }]);
    setLoading(true);

    try {
      // Parse intent from message
      let response = "";
      let data: any = null;

      if (msg.toLowerCase().includes("compliance")) {
        const match = msg.match(/from (\w+) to (\w+)/i);
        const result = await agentsApi.complianceCheck({
          product_description: msg,
          origin_country: match?.[1]?.toUpperCase() || "US",
          destination_country: match?.[2]?.toUpperCase() || "GB",
          declared_value: 500,
          weight_kg: 1,
        });
        data = result.data;
        response = `**Compliance Check Complete**\n\n` +
          `• HS Code: ${data.result?.hs_code || "N/A"}\n` +
          `• Risk Level: ${data.result?.risk_level || "N/A"}\n` +
          `• Estimated Duties: $${data.result?.estimated_duties_usd?.toFixed(2) || "0"}\n` +
          `• Confidence: ${((data.confidence || 0) * 100).toFixed(0)}%\n` +
          `• Status: ${data.result?.is_compliant ? "✅ Compliant" : "⚠️ Issues Found"}\n\n` +
          (data.result?.compliance_flags?.length ? `Flags: ${data.result.compliance_flags.join(", ")}` : "No compliance flags.");
      } else if (msg.toLowerCase().includes("rate") || msg.toLowerCase().includes("quote")) {
        response = "To get rate quotes, please use the **Rate Quotes** section in the Agent Console, or create a shipment and the agents will automatically find the best rates.";
      } else if (msg.toLowerCase().includes("carbon") || msg.toLowerCase().includes("footprint")) {
        const result = await agentsApi.carbonFootprint({
          origin_country: "US", destination_country: "CN",
          weight_kg: 5, transport_mode: "air_freight",
        });
        data = result.data;
        response = `**Carbon Footprint Analysis**\n\n` +
          `• Transport: ${data.transport_mode}\n` +
          `• Distance: ${data.distance_km?.toLocaleString()} km\n` +
          `• CO₂: ${data.carbon_footprint_kg_co2?.toFixed(4)} kg\n` +
          `• Carbon Credit Cost: $${data.carbon_credit_cost_usd?.toFixed(4)}\n` +
          `• Equivalent Trees: ${data.equivalent_trees_needed}`;
      } else if (msg.toLowerCase().includes("green") || msg.toLowerCase().includes("sustainable")) {
        response = "For green route optimization, use the **Sustainability** page or enable 'Prefer Green' when creating a shipment. The agent will automatically select EV-last-mile and low-carbon routes.";
      } else {
        response = `I understand you're asking about: "${msg}"\n\nI can help with:\n• **Compliance checks** — HS codes, duties, sanctions\n• **Rate quotes** — multi-carrier comparison\n• **Exception handling** — delays, damage, customs holds\n• **Carbon footprint** — sustainability analysis\n• **Green routes** — eco-friendly shipping options\n\nTry one of the quick prompts below or create a shipment to trigger the full agent workflow.`;
      }

      setMessages(prev => [...prev, { role: "assistant", content: response, data, timestamp: new Date() }]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `Error: ${err.response?.data?.detail || err.message}. Make sure the backend is running at localhost:8000.`,
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200">
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
          <Bot size={16} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Shipping Agent</p>
          <p className="text-xs text-green-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" /> Online · Gemini 1.5 Flash
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === "assistant" ? "bg-blue-600" : "bg-gray-700"
            }`}>
              {msg.role === "assistant" ? <Bot size={14} className="text-white" /> : <User size={14} className="text-white" />}
            </div>
            <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${
              msg.role === "assistant" ? "bg-slate-100 text-slate-800" : "bg-blue-600 text-white"
            }`}>
              <pre className="whitespace-pre-wrap font-sans leading-relaxed">{msg.content}</pre>
              <p className="text-xs opacity-40 mt-1">
                {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center">
              <Bot size={14} className="text-white" />
            </div>
            <div className="bg-slate-100 rounded-xl px-4 py-3 flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-blue-400" />
              <span className="text-sm text-slate-500">Agent thinking...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      <div className="px-4 py-2 flex gap-2 overflow-x-auto border-t border-slate-200">
        {QUICK_PROMPTS.map((p, i) => (
          <button key={i} onClick={() => sendMessage(p)}
            className="shrink-0 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-full transition-colors border border-slate-300">
            {p}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-200 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
          placeholder="Ask the agent anything about your shipments..."
          className="flex-1 bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
        />
        <Button onClick={() => sendMessage()} disabled={!input.trim() || loading} size="md">
          <Send size={16} />
        </Button>
      </div>
    </div>
  );
}
