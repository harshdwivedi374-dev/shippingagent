"use client";
import { useEffect, useState } from "react";
import { shipmentsApi } from "@/lib/api";
import { formatCurrency, getStatusColor, getConfidenceColor } from "@/lib/utils";
import { Package, TrendingUp, CheckCircle, AlertTriangle, Bot, Zap, Leaf, Clock } from "lucide-react";
import Link from "next/link";

export default function VendorOverview() {
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    shipmentsApi.list({ limit: 100 }).then(r => setShipments(r.data.items || [])).finally(() => setLoading(false));
  }, []);

  const total = shipments.length;
  const delivered = shipments.filter(s => s.status === "delivered").length;
  const inTransit = shipments.filter(s => ["in_transit", "picked_up", "out_for_delivery"].includes(s.status)).length;
  const exceptions = shipments.filter(s => s.status === "exception").length;
  const pending = shipments.filter(s => s.status === "awaiting_approval").length;
  const autoRate = total ? ((shipments.filter(s => s.auto_executed).length / total) * 100).toFixed(0) : 0;
  const totalSpend = shipments.reduce((a, s) => a + (s.quoted_rate || 0), 0);
  const greenCount = shipments.filter(s => s.is_green_route).length;

  const recentShipments = [...shipments].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 6);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Good morning, FastShip!</h1>
          <p className="text-slate-500 text-sm mt-1">Your AI agents have processed {total} shipments. Here's your overview.</p>
        </div>
        <Link href="/vendor/new"
          className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-400 hover:to-pink-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-all text-sm">
          <Package size={16} /> New Shipment
        </Link>
      </div>

      {/* AI Agent Status Banner */}
      <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-800/50 rounded-2xl p-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <Bot size={20} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">AI Agents Running</p>
              <p className="text-xs text-slate-500">Compliance · Router · Negotiator · Exception Handler</p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">{autoRate}%</p>
              <p className="text-xs text-slate-500">Auto-Executed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-400">{total}</p>
              <p className="text-xs text-slate-500">Processed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-400">{pending}</p>
              <p className="text-xs text-slate-500">Need Review</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Shipments", value: total, icon: Package, color: "text-blue-400", bg: "bg-blue-900/20", border: "border-blue-800/30" },
          { label: "In Transit", value: inTransit, icon: TrendingUp, color: "text-purple-400", bg: "bg-purple-900/20", border: "border-purple-800/30" },
          { label: "Delivered", value: delivered, icon: CheckCircle, color: "text-green-400", bg: "bg-green-900/20", border: "border-green-800/30" },
          { label: "Exceptions", value: exceptions, icon: AlertTriangle, color: "text-red-400", bg: "bg-red-900/20", border: "border-red-800/30" },
          { label: "Total Spend", value: formatCurrency(totalSpend), icon: TrendingUp, color: "text-cyan-400", bg: "bg-cyan-900/20", border: "border-cyan-800/30" },
          { label: "Awaiting Review", value: pending, icon: Clock, color: "text-orange-400", bg: "bg-orange-900/20", border: "border-orange-800/30" },
          { label: "Green Routes", value: greenCount, icon: Leaf, color: "text-emerald-400", bg: "bg-emerald-900/20", border: "border-emerald-800/30" },
          { label: "AI Auto-Rate", value: `${autoRate}%`, icon: Zap, color: "text-yellow-400", bg: "bg-yellow-900/20", border: "border-yellow-800/30" },
        ].map(({ label, value, icon: Icon, color, bg, border }) => (
          <div key={label} className={`rounded-xl border ${border} ${bg} p-4`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">{label}</p>
                <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
              </div>
              <Icon size={22} className={`${color} opacity-60`} />
            </div>
          </div>
        ))}
      </div>

      {/* Recent Shipments */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-white">Recent Shipments</h3>
          <Link href="/vendor/shipments" className="text-xs text-orange-400 hover:text-orange-300">View all →</Link>
        </div>
        <div className="divide-y divide-gray-800">
          {recentShipments.map((s: any) => (
            <div key={s.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(s.status)}`} />
                <div>
                  <p className="text-sm font-medium text-white">
                    {s.origin_address?.city} → {s.destination_address?.city}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {s.contents_description} · {s.weight_kg}kg · {s.selected_carrier || "Pending"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-right">
                <div>
                  <p className="text-sm font-semibold text-white">{s.quoted_rate ? formatCurrency(s.quoted_rate) : "—"}</p>
                  {s.agent_confidence_score && (
                    <p className={`text-xs ${getConfidenceColor(s.agent_confidence_score)}`}>
                      AI: {(s.agent_confidence_score * 100).toFixed(0)}%
                    </p>
                  )}
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full text-white font-medium ${getStatusColor(s.status)}`}>
                  {s.status.replace(/_/g, " ")}
                </span>
              </div>
            </div>
          ))}
          {recentShipments.length === 0 && (
            <div className="px-5 py-12 text-center text-sm text-slate-400">
              No shipments yet. <Link href="/vendor/new" className="text-orange-400">Create your first →</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
