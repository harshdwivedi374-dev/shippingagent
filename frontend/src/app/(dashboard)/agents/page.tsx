"use client";
import { useState } from "react";
import AgentChat from "@/components/agents/AgentChat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { agentsApi } from "@/lib/api";
import AgentThinkingPanel from "@/components/agents/AgentThinkingPanel";
import { Bot, FileCheck, DollarSign, AlertTriangle, Leaf } from "lucide-react";

const ADDR = { name: "Test", street1: "123 Main St", city: "New York", state: "NY", zip: "10001", country: "US" };
const ADDR_UK = { name: "Recipient", street1: "10 Downing St", city: "London", state: "", zip: "SW1A 2AA", country: "GB" };

export default function AgentsPage() {
  const [activeTab, setActiveTab] = useState<"chat" | "compliance" | "rates" | "exception" | "carbon">("chat");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [decisionLogs, setDecisionLogs] = useState<any[]>([]);

  // Compliance form
  const [compForm, setCompForm] = useState({ product_description: "Laptop computer", origin_country: "US", destination_country: "GB", declared_value: 1200, weight_kg: 2 });

  // Carbon form
  const [carbonForm, setCarbonForm] = useState({ origin_country: "US", destination_country: "CN", weight_kg: 5, transport_mode: "air_freight" });

  const runCompliance = async () => {
    setLoading(true); setResult(null);
    try {
      const res = await agentsApi.complianceCheck(compForm);
      setResult(res.data);
      if (res.data.decision_id) setDecisionLogs([res.data]);
    } catch (e: any) { setResult({ error: e.response?.data?.detail || e.message }); }
    finally { setLoading(false); }
  };

  const runRates = async () => {
    setLoading(true); setResult(null);
    try {
      const res = await agentsApi.getRateQuotes({ origin_address: ADDR, destination_address: ADDR_UK, weight_kg: 2 });
      setResult(res.data);
    } catch (e: any) { setResult({ error: e.response?.data?.detail || e.message }); }
    finally { setLoading(false); }
  };

  const runCarbon = async () => {
    setLoading(true); setResult(null);
    try {
      const res = await agentsApi.carbonFootprint(carbonForm);
      setResult(res.data);
    } catch (e: any) { setResult({ error: e.response?.data?.detail || e.message }); }
    finally { setLoading(false); }
  };

  const tabs = [
    { key: "chat", label: "AI Chat", icon: Bot },
    { key: "compliance", label: "Compliance", icon: FileCheck },
    { key: "rates", label: "Rate Quotes", icon: DollarSign },
    { key: "exception", label: "Exception", icon: AlertTriangle },
    { key: "carbon", label: "Carbon", icon: Leaf },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Agent Console</h2>
        <p className="text-sm text-slate-500 mt-0.5">Interact directly with individual agents or use the AI chat</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => { setActiveTab(key as any); setResult(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-1 justify-center ${
              activeTab === key ? "bg-blue-600 text-white" : "text-slate-500 hover:text-white hover:bg-slate-100"
            }`}>
            <Icon size={15} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Chat */}
      {activeTab === "chat" && (
        <div className="h-[600px]"><AgentChat /></div>
      )}

      {/* Compliance */}
      {activeTab === "compliance" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><FileCheck size={16} className="text-purple-400" /> Compliance Check</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Input label="Product Description" value={compForm.product_description} onChange={e => setCompForm(f => ({ ...f, product_description: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Origin Country" value={compForm.origin_country} onChange={e => setCompForm(f => ({ ...f, origin_country: e.target.value.toUpperCase() }))} maxLength={2} />
                <Input label="Destination Country" value={compForm.destination_country} onChange={e => setCompForm(f => ({ ...f, destination_country: e.target.value.toUpperCase() }))} maxLength={2} />
                <Input label="Declared Value (USD)" type="number" value={compForm.declared_value} onChange={e => setCompForm(f => ({ ...f, declared_value: +e.target.value }))} />
                <Input label="Weight (kg)" type="number" value={compForm.weight_kg} onChange={e => setCompForm(f => ({ ...f, weight_kg: +e.target.value }))} />
              </div>
              <Button onClick={runCompliance} loading={loading} className="w-full">Run Compliance Agent</Button>
            </CardContent>
          </Card>
          {result && (
            <Card>
              <CardHeader><CardTitle>Result</CardTitle></CardHeader>
              <CardContent>
                <pre className="text-xs text-slate-700 whitespace-pre-wrap overflow-auto max-h-96 bg-slate-100 rounded-lg p-3">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Rates */}
      {activeTab === "rates" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign size={16} className="text-green-400" /> Multi-Carrier Rate Quotes</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-100 rounded-lg p-3 text-xs text-slate-500">
                <p className="font-medium text-white mb-1">Test Route</p>
                <p>New York, NY, US → London, GB</p>
                <p>Weight: 2kg</p>
              </div>
              <Button onClick={runRates} loading={loading} className="w-full">Get Live Rates</Button>
              <p className="text-xs text-slate-400 text-center">Requires EASYPOST_API_KEY in .env for real rates</p>
            </CardContent>
          </Card>
          {result && (
            <Card>
              <CardHeader><CardTitle>Rate Quotes ({result.total_quotes || 0})</CardTitle></CardHeader>
              <CardContent>
                {result.all_rates?.length > 0 ? (
                  <div className="space-y-2">
                    {result.all_rates.map((r: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-slate-100 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-white">{r.carrier} — {r.service}</p>
                          <p className="text-xs text-slate-500">{r.transit_days ? `${r.transit_days} days` : "Transit TBD"}</p>
                        </div>
                        <span className="text-green-400 font-bold">${r.rate?.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <pre className="text-xs text-slate-700 whitespace-pre-wrap bg-slate-100 rounded-lg p-3">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Carbon */}
      {activeTab === "carbon" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Leaf size={16} className="text-green-400" /> Carbon Footprint Calculator</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input label="Origin Country" value={carbonForm.origin_country} onChange={e => setCarbonForm(f => ({ ...f, origin_country: e.target.value.toUpperCase() }))} maxLength={2} />
                <Input label="Destination Country" value={carbonForm.destination_country} onChange={e => setCarbonForm(f => ({ ...f, destination_country: e.target.value.toUpperCase() }))} maxLength={2} />
                <Input label="Weight (kg)" type="number" value={carbonForm.weight_kg} onChange={e => setCarbonForm(f => ({ ...f, weight_kg: +e.target.value }))} />
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-500">Transport Mode</label>
                  <select value={carbonForm.transport_mode} onChange={e => setCarbonForm(f => ({ ...f, transport_mode: e.target.value }))}
                    className="bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
                    {["air_freight","ocean_freight","road_freight_diesel","road_freight_ev","rail_freight","express_courier"].map(m => (
                      <option key={m} value={m}>{m.replace(/_/g, " ")}</option>
                    ))}
                  </select>
                </div>
              </div>
              <Button onClick={runCarbon} loading={loading} className="w-full">Calculate Carbon</Button>
            </CardContent>
          </Card>
          {result && !result.error && (
            <Card>
              <CardHeader><CardTitle>Carbon Analysis</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Transport Mode", value: result.transport_mode?.replace(/_/g, " ") },
                  { label: "Distance", value: `${result.distance_km?.toLocaleString()} km` },
                  { label: "CO₂ Footprint", value: `${result.carbon_footprint_kg_co2?.toFixed(4)} kg`, highlight: true },
                  { label: "Carbon Credit Cost", value: `$${result.carbon_credit_cost_usd?.toFixed(4)}` },
                  { label: "Equivalent Trees/Year", value: result.equivalent_trees_needed },
                ].map(({ label, value, highlight }) => (
                  <div key={label} className="flex justify-between items-center py-2 border-b border-slate-200">
                    <span className="text-sm text-slate-500">{label}</span>
                    <span className={`text-sm font-semibold ${highlight ? "text-green-400" : "text-white"}`}>{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
