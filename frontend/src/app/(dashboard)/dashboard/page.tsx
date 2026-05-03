"use client";
import { useEffect, useState } from "react";
import { shipmentsApi, escalationsApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ShipmentStatusChart from "@/components/charts/ShipmentStatusChart";
import CarrierPerformanceChart from "@/components/charts/CarrierPerformanceChart";
import ConfidenceGaugeChart from "@/components/charts/ConfidenceGaugeChart";
import { Package, AlertTriangle, Bot, Leaf, TrendingUp, Clock, CheckCircle, Zap } from "lucide-react";
import { formatCurrency, getConfidenceColor } from "@/lib/utils";
import Link from "next/link";

export default function DashboardPage() {
  const [shipments, setShipments] = useState<any[]>([]);
  const [escalations, setEscalations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      shipmentsApi.list({ limit: 100 }),
      escalationsApi.list({ status: "pending" }),
    ]).then(([s, e]) => {
      setShipments(s.data.items || []);
      setEscalations(e.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const total        = shipments.length;
  const delivered    = shipments.filter(s => s.status === "delivered").length;
  const inTransit    = shipments.filter(s => s.status === "in_transit").length;
  const exceptions   = shipments.filter(s => s.status === "exception").length;
  const autoExecuted = shipments.filter(s => s.auto_executed).length;
  const greenRoutes  = shipments.filter(s => s.is_green_route).length;
  const avgConf      = shipments.filter(s => s.agent_confidence_score)
    .reduce((a, s) => a + s.agent_confidence_score, 0) /
    (shipments.filter(s => s.agent_confidence_score).length || 1);
  const totalRevenue = shipments.reduce((a, s) => a + (s.quoted_rate || 0), 0);

  const statusCounts = shipments.reduce((acc: any, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1; return acc;
  }, {});
  const statusData = Object.entries(statusCounts).map(([status, count]) => ({ status, count: count as number }));

  const stats = [
    { label: "Total Shipments",   value: total,                    icon: Package,      color: "text-blue-600",   bg: "bg-blue-50",   border: "border-blue-100"   },
    { label: "In Transit",        value: inTransit,                icon: TrendingUp,   color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-100" },
    { label: "Delivered",         value: delivered,                icon: CheckCircle,  color: "text-green-600",  bg: "bg-green-50",  border: "border-green-100"  },
    { label: "Exceptions",        value: exceptions,               icon: AlertTriangle,color: "text-red-600",    bg: "bg-red-50",    border: "border-red-100"    },
    { label: "Auto-Executed",     value: autoExecuted,             icon: Zap,          color: "text-amber-600",  bg: "bg-amber-50",  border: "border-amber-100"  },
    { label: "Green Routes",      value: greenRoutes,              icon: Leaf,         color: "text-emerald-600",bg: "bg-emerald-50",border: "border-emerald-100"},
    { label: "Pending Review",    value: escalations.length,       icon: Clock,        color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-100" },
    { label: "Total Spend",       value: formatCurrency(totalRevenue), icon: TrendingUp, color: "text-cyan-600", bg: "bg-cyan-50",   border: "border-cyan-100"   },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500">Loading dashboard...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">{stat.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl ${stat.bg} border ${stat.border} flex items-center justify-center`}>
                  <stat.icon size={20} className={stat.color} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Pie */}
        <Card>
          <CardHeader><CardTitle>Shipment Status</CardTitle></CardHeader>
          <CardContent>
            <ShipmentStatusChart data={statusData} />
          </CardContent>
        </Card>

        {/* Carrier Bar */}
        <Card>
          <CardHeader><CardTitle>Carrier On-Time Rate</CardTitle></CardHeader>
          <CardContent>
            <CarrierPerformanceChart
              carriers={["FedEx", "UPS", "DHL", "USPS"]}
              onTimeRates={[0.94, 0.96, 0.97, 0.91]}
              avgDelays={[1.2, 0.8, 0.5, 2.5]}
            />
          </CardContent>
        </Card>

        {/* Confidence Gauge */}
        <Card>
          <CardHeader><CardTitle>AI Confidence Score</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-4">
            <ConfidenceGaugeChart value={Math.round(avgConf * 100)} />
            <div className="mt-4 grid grid-cols-3 gap-3 w-full text-center">
              {[
                { label: "Auto-Exec", value: autoExecuted, color: "text-green-400" },
                { label: "Escalated", value: escalations.length, color: "text-yellow-400" },
                { label: "Exceptions", value: exceptions, color: "text-red-400" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-slate-50 rounded-xl p-2">
                  <p className={`text-lg font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-slate-400">{label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Escalations */}
      {escalations.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-orange-400" />
                Pending Human Review ({escalations.length})
              </CardTitle>
              <Link href="/escalations" className="text-xs text-blue-400 hover:text-blue-300">View all →</Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {escalations.slice(0, 3).map((esc: any) => (
              <div key={esc.id} className="flex items-center justify-between p-3 bg-orange-900/10 border border-orange-800/50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-slate-900">Shipment needs review</p>
                  <p className="text-xs text-slate-600 mt-0.5">{esc.reason?.slice(0, 80)}...</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-bold ${getConfidenceColor(esc.confidence_score)}`}>
                    {(esc.confidence_score * 100).toFixed(0)}%
                  </span>
                  <Link href={`/escalations/${esc.id}`}><Badge variant="warning">Review</Badge></Link>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent Shipments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Shipments</CardTitle>
            <Link href="/shipments" className="text-xs text-blue-400 hover:text-blue-300">View all →</Link>
          </div>
        </CardHeader>
        <CardContent>
          {shipments.length === 0 ? (
            <div className="text-center py-8">
              <Package size={32} className="text-slate-500 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No shipments yet</p>
              <Link href="/shipments" className="text-xs text-blue-400 hover:text-blue-300 mt-1 inline-block">Create your first shipment →</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {shipments.slice(0, 5).map((s: any) => (
                <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${s.status === "delivered" ? "bg-green-400" : s.status === "exception" ? "bg-red-400" : "bg-blue-400"}`} />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{s.origin_address?.city} → {s.destination_address?.city}</p>
                      <p className="text-xs text-slate-600">{s.selected_carrier || "Pending"} · {s.weight_kg}kg</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {s.quoted_rate && <span className="text-xs text-green-400">{formatCurrency(s.quoted_rate)}</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full text-white ${s.status === "delivered" ? "bg-green-600" : s.status === "exception" ? "bg-red-600" : "bg-blue-600"}`}>
                      {s.status.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
