"use client";
import { useEffect, useState } from "react";
import { shipmentsApi } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import CarrierPieChart from "@/components/charts/CarrierPieChart";
import SpendLineChart from "@/components/charts/SpendLineChart";
import ConfidenceGaugeChart from "@/components/charts/ConfidenceGaugeChart";
import AgentDecisionBarChart from "@/components/charts/AgentDecisionBarChart";
import ShipmentStatusChart from "@/components/charts/ShipmentStatusChart";
import { TrendingUp, Package, Leaf, DollarSign, Zap, Clock } from "lucide-react";

export default function VendorReports() {
  const [shipments, setShipments] = useState<any[]>([]);

  useEffect(() => {
    shipmentsApi.list({ limit: 200 }).then(r => setShipments(r.data.items || []));
  }, []);

  const total      = shipments.length;
  const delivered  = shipments.filter(s => s.status === "delivered").length;
  const totalSpend = shipments.reduce((a, s) => a + (s.quoted_rate || 0), 0);
  const avgRate    = total ? totalSpend / total : 0;
  const greenCount = shipments.filter(s => s.is_green_route).length;
  const autoCount  = shipments.filter(s => s.auto_executed).length;
  const totalCarbon = shipments.reduce((a, s) => a + (s.carbon_footprint_kg || 0), 0);
  const avgConf    = shipments.filter(s => s.agent_confidence_score)
    .reduce((a, s) => a + s.agent_confidence_score, 0) /
    (shipments.filter(s => s.agent_confidence_score).length || 1);

  // Carrier breakdown
  const carrierMap = shipments.reduce((acc: any, s) => {
    if (s.selected_carrier) acc[s.selected_carrier] = (acc[s.selected_carrier] || 0) + 1;
    return acc;
  }, {});
  const carrierData = Object.entries(carrierMap).map(([carrier, count]) => ({ carrier, count: count as number }));

  // Monthly spend
  const monthlyData: Record<string, number> = {};
  shipments.forEach(s => {
    const m = new Date(s.created_at).toLocaleString("default", { month: "short", year: "2-digit" });
    monthlyData[m] = (monthlyData[m] || 0) + (s.quoted_rate || 0);
  });
  const months       = Object.keys(monthlyData).slice(-6);
  const monthlySpend = months.map(m => monthlyData[m]);

  // Status distribution
  const statusCounts = shipments.reduce((acc: any, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1; return acc;
  }, {});
  const statusData = Object.entries(statusCounts).map(([status, count]) => ({ status, count: count as number }));

  // Agent decisions
  const agentLabels = ["Auto-Exec", "Escalated", "Exceptions", "Green", "Delivered"];
  const agentValues = [autoCount, shipments.filter(s => !s.auto_executed && s.agent_confidence_score).length, shipments.filter(s => s.status === "exception").length, greenCount, delivered];

  const kpis = [
    { label: "Total Shipments",    value: total,                    icon: Package,      color: "text-blue-400"    },
    { label: "Delivered",          value: `${delivered} (${total ? ((delivered/total)*100).toFixed(0) : 0}%)`, icon: TrendingUp, color: "text-green-400" },
    { label: "Total Spend",        value: formatCurrency(totalSpend), icon: DollarSign, color: "text-cyan-400"   },
    { label: "Avg Cost/Shipment",  value: formatCurrency(avgRate),  icon: DollarSign,   color: "text-yellow-400" },
    { label: "Green Routes",       value: `${greenCount} (${total ? ((greenCount/total)*100).toFixed(0) : 0}%)`, icon: Leaf, color: "text-emerald-400" },
    { label: "AI Auto-Executed",   value: `${autoCount} (${total ? ((autoCount/total)*100).toFixed(0) : 0}%)`, icon: Zap, color: "text-purple-400" },
    { label: "Total CO₂",          value: `${totalCarbon.toFixed(2)} kg`, icon: Leaf,  color: "text-green-400"  },
    { label: "Avg AI Confidence",  value: `${(avgConf * 100).toFixed(0)}%`, icon: Clock, color: "text-orange-400" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Reports & Analytics</h1>
        <p className="text-sm text-slate-500 mt-0.5">Your shipping performance powered by AI</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">{label}</p>
                <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
              </div>
              <Icon size={20} className={`${color} opacity-50`} />
            </div>
          </div>
        ))}
      </div>

      {/* Row 1 — Carrier Pie + Monthly Spend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-sm font-semibold text-white mb-4">Carrier Distribution</p>
          <CarrierPieChart data={carrierData} />
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-sm font-semibold text-white mb-4">Monthly Shipping Spend</p>
          <SpendLineChart months={months} values={monthlySpend} color="#f97316" />
        </div>
      </div>

      {/* Row 2 — Status + AI Confidence */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-sm font-semibold text-white mb-4">Shipment Status Breakdown</p>
          <ShipmentStatusChart data={statusData} />
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col items-center justify-center">
          <p className="text-sm font-semibold text-white mb-4">AI Confidence Score</p>
          <ConfidenceGaugeChart value={Math.round(avgConf * 100)} />
        </div>
      </div>

      {/* Row 3 — Agent Decisions */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <p className="text-sm font-semibold text-white mb-4">Agent Decision Breakdown</p>
        <AgentDecisionBarChart labels={agentLabels} values={agentValues} />
      </div>

      {/* Carrier table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <p className="text-sm font-semibold text-white">Carrier Performance Summary</p>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              {["Carrier","Shipments","Avg Rate","On-Time Rate","Reliability"].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs font-medium text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { carrier: "DHL",   onTime: "97%", reliability: "Excellent", color: "text-green-400"  },
              { carrier: "UPS",   onTime: "96%", reliability: "Excellent", color: "text-green-400"  },
              { carrier: "FEDEX", onTime: "94%", reliability: "Good",      color: "text-blue-400"   },
              { carrier: "USPS",  onTime: "91%", reliability: "Fair",      color: "text-yellow-400" },
            ].map(({ carrier, onTime, reliability, color }) => {
              const count = carrierMap[carrier] || 0;
              const cs    = shipments.filter(s => s.selected_carrier === carrier);
              const avg   = cs.length ? cs.reduce((a, s) => a + (s.quoted_rate || 0), 0) / cs.length : 0;
              return (
                <tr key={carrier} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="px-5 py-3 text-sm font-semibold text-white">{carrier}</td>
                  <td className="px-5 py-3 text-sm text-slate-700">{count}</td>
                  <td className="px-5 py-3 text-sm text-green-400">{avg ? formatCurrency(avg) : "—"}</td>
                  <td className="px-5 py-3 text-sm text-white">{onTime}</td>
                  <td className="px-5 py-3"><span className={`text-xs font-medium ${color}`}>{reliability}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
