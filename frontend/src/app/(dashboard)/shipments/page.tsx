"use client";
import { useEffect, useState } from "react";
import { shipmentsApi } from "@/lib/api";
import ShipmentTable from "@/components/shipments/ShipmentTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, X, Loader2 } from "lucide-react";
import { Shipment } from "@/types";

const EMPTY_ADDRESS = { name: "", street1: "", city: "", state: "", zip: "", country: "US" };

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    origin_address: { ...EMPTY_ADDRESS, name: "Sender Name" },
    destination_address: { ...EMPTY_ADDRESS, name: "Recipient Name" },
    weight_kg: 1.0,
    declared_value: 100,
    contents_description: "Electronics",
    priority: "standard",
    prefer_green: false,
  });

  const load = async () => {
    try {
      const res = await shipmentsApi.list({ limit: 100 });
      setShipments(res.data.items || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await shipmentsApi.create(form);
      setShowForm(false);
      await load();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to create shipment");
    } finally { setCreating(false); }
  };

  const updateAddr = (side: "origin_address" | "destination_address", field: string, value: string) => {
    setForm(f => ({ ...f, [side]: { ...f[side], [field]: value } }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Shipments</h2>
          <p className="text-sm text-slate-500 mt-0.5">Create a shipment and agents run automatically</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? "Cancel" : "New Shipment"}
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card>
          <CardHeader><CardTitle>Create Shipment — Agents will auto-process</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Origin */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-blue-400">Origin Address</h3>
                  {["name", "street1", "city", "state", "zip"].map(f => (
                    <Input key={f} label={f.charAt(0).toUpperCase() + f.slice(1)}
                      value={(form.origin_address as any)[f]}
                      onChange={e => updateAddr("origin_address", f, e.target.value)} />
                  ))}
                  <Input label="Country (2-letter)" value={form.origin_address.country}
                    onChange={e => updateAddr("origin_address", "country", e.target.value.toUpperCase())} maxLength={2} />
                </div>
                {/* Destination */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-purple-400">Destination Address</h3>
                  {["name", "street1", "city", "state", "zip"].map(f => (
                    <Input key={f} label={f.charAt(0).toUpperCase() + f.slice(1)}
                      value={(form.destination_address as any)[f]}
                      onChange={e => updateAddr("destination_address", f, e.target.value)} />
                  ))}
                  <Input label="Country (2-letter)" value={form.destination_address.country}
                    onChange={e => updateAddr("destination_address", "country", e.target.value.toUpperCase())} maxLength={2} />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Input label="Weight (kg)" type="number" step="0.1" min="0.1"
                  value={form.weight_kg} onChange={e => setForm(f => ({ ...f, weight_kg: parseFloat(e.target.value) }))} />
                <Input label="Declared Value (USD)" type="number" min="0"
                  value={form.declared_value} onChange={e => setForm(f => ({ ...f, declared_value: parseFloat(e.target.value) }))} />
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-500">Priority</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                    className="bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
                    {["standard", "express", "overnight", "economy", "freight"].map(p => (
                      <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-500">Prefer Green Route</label>
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input type="checkbox" checked={form.prefer_green}
                      onChange={e => setForm(f => ({ ...f, prefer_green: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-600 bg-slate-100 text-blue-500" />
                    <span className="text-sm text-slate-700">Enable</span>
                  </label>
                </div>
              </div>

              <Input label="Contents Description" value={form.contents_description}
                onChange={e => setForm(f => ({ ...f, contents_description: e.target.value }))} />

              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" loading={creating}>
                  {creating ? "Agents Processing..." : "Create & Run Agents"}
                </Button>
                <p className="text-xs text-slate-400">
                  Compliance → Router → Negotiator agents will run automatically
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 size={24} className="animate-spin text-blue-400" />
        </div>
      ) : (
        <ShipmentTable data={shipments} />
      )}
    </div>
  );
}
