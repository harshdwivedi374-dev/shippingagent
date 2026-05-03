"use client";
import { useState } from "react";
import { agentsApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CarbonChart from "@/components/charts/CarbonChart";
import SpendLineChart from "@/components/charts/SpendLineChart";
import { Leaf, Zap, TreePine, DollarSign } from "lucide-react";

export default function SustainabilityPage() {
  const [form, setForm] = useState({ origin_country: "US", destination_country: "CN", weight_kg: 10, transport_mode: "air_freight" });
  const [greenForm, setGreenForm] = useState({ origin_country: "US", destination_country: "GB", weight_kg: 5 });
  const [carbonResult, setCarbonResult] = useState<any>(null);
  const [greenResult, setGreenResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [greenLoading, setGreenLoading] = useState(false);

  const calcCarbon = async () => {
    setLoading(true);
    try { const r = await agentsApi.carbonFootprint(form); setCarbonResult(r.data); }
    catch (e: any) { setCarbonResult({ error: e.message }); }
    finally { setLoading(false); }
  };

  const findGreenRoutes = async () => {
    setGreenLoading(true);
    try {
      const r = await agentsApi.greenRoutes(
        { origin_address: { name: "S", street1: "1 Main", city: "NYC", zip: "10001", country: greenForm.origin_country },
          destination_address: { name: "R", street1: "1 High St", city: "London", zip: "SW1", country: greenForm.destination_country },
          weight_kg: greenForm.weight_kg, declared_value: 500, priority: "standard" },
        { max_transit_days: 30, budget_usd: 500 }
      );
      setGreenResult(r.data);
    } catch (e: any) { setGreenResult({ error: e.message }); }
    finally { setGreenLoading(false); }
  };

  const modes     = ["air_freight", "express_courier", "road_diesel", "road_ev", "rail", "ocean"];
  const emissions = [0.602, 0.150, 0.096, 0.020, 0.028, 0.010];

  // Green score bar chart data
  const greenModes  = greenResult?.all_options?.map((o: any) => o.mode?.replace(/_/g, " ")) || [];
  const greenScores = greenResult?.all_options?.map((o: any) => Math.round(o.green_score * 100)) || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Sustainability</h2>
        <p className="text-sm text-slate-500 mt-0.5">Carbon footprint analysis and green route optimization</p>
      </div>

      {/* Emission factors reference */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Leaf size={16} className="text-green-400" /> CO₂ Emission Factors by Transport Mode</CardTitle></CardHeader>
        <CardContent>
          <CarbonChart modes={modes} emissions={emissions} />
          <p className="text-xs text-slate-400 mt-2 text-center">kg CO₂ per tonne-km · Ocean freight is 60× cleaner than air</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Carbon Calculator */}
        <Card>
          <CardHeader><CardTitle>Carbon Footprint Calculator</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Origin" value={form.origin_country} onChange={e => setForm(f => ({ ...f, origin_country: e.target.value.toUpperCase() }))} maxLength={2} />
              <Input label="Destination" value={form.destination_country} onChange={e => setForm(f => ({ ...f, destination_country: e.target.value.toUpperCase() }))} maxLength={2} />
              <Input label="Weight (kg)" type="number" value={form.weight_kg} onChange={e => setForm(f => ({ ...f, weight_kg: +e.target.value }))} />
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Mode</label>
                <select value={form.transport_mode} onChange={e => setForm(f => ({ ...f, transport_mode: e.target.value }))}
                  className="bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
                  {["air_freight","express_courier","road_freight_diesel","road_freight_ev","rail_freight","ocean_freight"].map(m => (
                    <option key={m} value={m}>{m.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
            </div>
            <Button onClick={calcCarbon} loading={loading} className="w-full">Calculate</Button>

            {carbonResult && !carbonResult.error && (
              <div className="space-y-2 pt-2">
                {[
                  { icon: Leaf,      label: "CO₂ Footprint",      value: `${carbonResult.carbon_footprint_kg_co2?.toFixed(4)} kg`, color: "text-green-400"  },
                  { icon: DollarSign,label: "Carbon Credit Cost",  value: `$${carbonResult.carbon_credit_cost_usd?.toFixed(4)}`,    color: "text-yellow-400" },
                  { icon: TreePine,  label: "Trees Needed/Year",   value: carbonResult.equivalent_trees_needed,                     color: "text-emerald-400"},
                  { icon: Zap,       label: "Distance",            value: `${carbonResult.distance_km?.toLocaleString()} km`,       color: "text-blue-400"   },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div key={label} className="flex items-center justify-between p-3 bg-slate-100 rounded-lg">
                    <div className="flex items-center gap-2"><Icon size={14} className={color} /><span className="text-sm text-slate-700">{label}</span></div>
                    <span className={`text-sm font-bold ${color}`}>{value}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Green Routes */}
        <Card>
          <CardHeader><CardTitle>Green Route Optimizer</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Input label="Origin" value={greenForm.origin_country} onChange={e => setGreenForm(f => ({ ...f, origin_country: e.target.value.toUpperCase() }))} maxLength={2} />
              <Input label="Destination" value={greenForm.destination_country} onChange={e => setGreenForm(f => ({ ...f, destination_country: e.target.value.toUpperCase() }))} maxLength={2} />
              <Input label="Weight (kg)" type="number" value={greenForm.weight_kg} onChange={e => setGreenForm(f => ({ ...f, weight_kg: +e.target.value }))} />
            </div>
            <Button onClick={findGreenRoutes} loading={greenLoading} className="w-full" variant="secondary">
              <Leaf size={16} /> Find Green Routes
            </Button>

            {/* Green score bar chart */}
            {greenResult && !greenResult.error && greenModes.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 mb-2">Green Score by Mode (higher = greener)</p>
                <SpendLineChart
                  months={greenModes}
                  values={greenScores}
                  label="Green Score (%)"
                  color="#22c55e"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
