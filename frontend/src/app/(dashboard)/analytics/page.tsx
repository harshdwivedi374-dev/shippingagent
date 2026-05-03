"use client";
import { useEffect, useState } from "react";
import { shipmentsApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ShipmentStatusChart from "@/components/charts/ShipmentStatusChart";
import CarrierPerformanceChart from "@/components/charts/CarrierPerformanceChart";
import CarbonChart from "@/components/charts/CarbonChart";
import SpendLineChart from "@/components/charts/SpendLineChart";
import ConfidenceGaugeChart from "@/components/charts/ConfidenceGaugeChart";
import CarrierPieChart from "@/components/charts/CarrierPieChart";
import AgentDecisionBarChart from "@/components/charts/AgentDecisionBarChart";
import { formatCurrency } from "@/lib/utils";

export default function AnalyticsPage() {
  const [shipments, setShipments] = useState<any[]>([]);

  useEffect(() => {
    shipmentsApi.list({ limit: 200 }).then(r => setShipments(r.data.items || []));
  }, []);

  const total      = shipments.length;
  const delivered  = shipments.filter(s => s.status === "delivered").length;
  const autoCount  = shipments.filter(s => s.auto_executed).length;
  const greenCount = shipments.filter(s => s.is_green_route).length;
  const totalCost  = shipments.reduce((a, s) => a + (s.quoted_rate || 0), 0);
  const avgConf    = shipments.filter(s => s.agent_confidence_score)
    .reduce((a, s) => a + s.agent_confidence_score, 0) /
    (shipments.filter(s => s.agent_confidence_score).length || 1);

  // Status distribution
  const statusCounts = shipments.reduce((acc: any, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1; return acc;
  }, {});
  const statusData = Object.entries(statusCounts).map(([status, count]) => ({ status, count: count as number }));

  // Carrier distribution
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
  const months      = Object.keys(monthlyData).slice(-6);
  const monthlySpend = months.map(m => monthlyData[m]);

  // Agent decision breakdown
  const agentLabels = ["Auto-Executed", "Escalated", "Exceptions", "Green Routes", "Delivered"];
  const agentValues = [autoCount, shipments.filter(s => !s.auto_executed && s.agent_confidence_score).length, shipments.filter(s => s.status === "exception").length, greenCount, delivered];

  // Carbon modes
  const carbonModes    = ["air_freight", "express_courier", "road_diesel", "road_ev", "rail", "ocean"];
  const carbonEmissions = [0.602, 0.150, 0.096, 0.020, 0.028, 0.010];

  const kpis = [
    { label: "Total Shipments",    value: total,                    color: "text-blue-400"    },
    { label: "Delivered",          value: `${delivered} (${total ? ((delivered/total)*100).toFixed(0) : 0}%)`, color: "text-green-400" },
    { label: "Auto-Execution Rate",value: `${total ? ((autoCount/total)*100).toFixed(0) : 0}%`, color: "text-yellow-400" },
    { label: "Total Spend",        value: formatCurrency(totalCost), color: "text-cyan-400"   },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Analytics</h2>
        <p className="text-sm text-slate-500 mt-0.5">Performance metrics and shipping intelligence</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(({ label, value, color }) => (
          <Card key={label}>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-slate-500">{label}</p>
              <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Row 1 — Status + Carrier Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Shipment Status Breakdown</CardTitle></CardHeader>
          <CardContent><ShipmentStatusChart data={statusData} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Carrier Distribution</CardTitle></CardHeader>
          <CardContent><CarrierPieChart data={carrierData} /></CardContent>
        </Card>
      </div>

      {/* Row 2 — Monthly Spend Line + Confidence Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Monthly Shipping Spend</CardTitle></CardHeader>
            <CardContent><SpendLineChart months={months} values={monthlySpend} /></CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader><CardTitle>AI Confidence</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-center py-4">
            <ConfidenceGaugeChart value={Math.round(avgConf * 100)} />
          </CardContent>
        </Card>
      </div>

      {/* Row 3 — Carrier On-Time + Agent Decisions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Carrier On-Time Performance</CardTitle></CardHeader>
          <CardContent>
            <CarrierPerformanceChart
              carriers={["FedEx", "UPS", "DHL", "USPS"]}
              onTimeRates={[0.94, 0.96, 0.97, 0.91]}
              avgDelays={[1.2, 0.8, 0.5, 2.5]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Agent Decision Breakdown</CardTitle></CardHeader>
          <CardContent>
            <AgentDecisionBarChart labels={agentLabels} values={agentValues} />
          </CardContent>
        </Card>
      </div>

      {/* Row 4 — Carbon Emissions */}
      <Card>
        <CardHeader><CardTitle>CO₂ Emissions by Transport Mode (kg per tonne-km)</CardTitle></CardHeader>
        <CardContent>
          <CarbonChart modes={carbonModes} emissions={carbonEmissions} />
          <p className="text-xs text-slate-400 mt-2 text-center">Ocean freight is 60× cleaner than air freight</p>
        </CardContent>
      </Card>
    </div>
  );
}
