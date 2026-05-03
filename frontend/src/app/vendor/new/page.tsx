"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { shipmentsApi } from "@/lib/api";
import { Bot, CheckCircle, Loader2, Package, ArrowRight } from "lucide-react";

const STEPS = ["Package Details", "Origin", "Destination", "Review & Ship"];

export default function VendorNewShipment() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [agentStep, setAgentStep] = useState("");

  const [form, setForm] = useState({
    weight_kg: 2.0,
    declared_value: 500,
    contents_description: "Electronics",
    priority: "standard",
    prefer_green: false,
    is_hazmat: false,
    origin_address: { name: "", company: "", street1: "", city: "", state: "", zip: "", country: "US" },
    destination_address: { name: "", company: "", street1: "", city: "", state: "", zip: "", country: "GB" },
  });

  const updateOrigin = (k: string, v: string) => setForm(f => ({ ...f, origin_address: { ...f.origin_address, [k]: v } }));
  const updateDest = (k: string, v: string) => setForm(f => ({ ...f, destination_address: { ...f.destination_address, [k]: v } }));

  const handleSubmit = async () => {
    setLoading(true);
    const steps = ["Running Compliance Agent...", "Selecting optimal route...", "Negotiating best rate...", "Finalizing shipment..."];
    for (const s of steps) {
      setAgentStep(s);
      await new Promise(r => setTimeout(r, 800));
    }
    try {
      const res = await shipmentsApi.create(form);
      setResult(res.data);
      setStep(4);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to create shipment");
    } finally {
      setLoading(false);
      setAgentStep("");
    }
  };

  const inputCls = "w-full bg-slate-100 border border-slate-300 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-orange-500 transition-colors text-sm";
  const labelCls = "text-xs font-medium text-slate-500 block mb-1.5";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">New Shipment</h1>
        <p className="text-slate-500 text-sm mt-1">AI agents will automatically handle compliance, routing, and rate negotiation</p>
      </div>

      {/* Progress */}
      {step < 4 && (
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                i < step ? "bg-green-500 text-white" : i === step ? "bg-orange-500 text-white" : "bg-gray-700 text-slate-500"
              }`}>
                {i < step ? <CheckCircle size={14} /> : i + 1}
              </div>
              <span className={`text-xs hidden sm:block ${i === step ? "text-white font-medium" : "text-slate-400"}`}>{s}</span>
              {i < STEPS.length - 1 && <div className={`flex-1 h-px ${i < step ? "bg-green-500" : "bg-gray-700"}`} />}
            </div>
          ))}
        </div>
      )}

      {/* Step 0 — Package */}
      {step === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-white flex items-center gap-2"><Package size={18} className="text-orange-400" /> Package Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelCls}>Weight (kg)</label><input type="number" step="0.1" min="0.1" value={form.weight_kg} onChange={e => setForm(f => ({ ...f, weight_kg: +e.target.value }))} className={inputCls} /></div>
            <div><label className={labelCls}>Declared Value (USD)</label><input type="number" min="0" value={form.declared_value} onChange={e => setForm(f => ({ ...f, declared_value: +e.target.value }))} className={inputCls} /></div>
          </div>
          <div><label className={labelCls}>Contents Description</label><input value={form.contents_description} onChange={e => setForm(f => ({ ...f, contents_description: e.target.value }))} className={inputCls} placeholder="e.g. Laptop computers" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className={inputCls}>
                {["standard","express","overnight","economy","freight"].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-3 pt-5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.prefer_green} onChange={e => setForm(f => ({ ...f, prefer_green: e.target.checked }))} className="w-4 h-4 rounded" />
                <span className="text-sm text-slate-700">🌿 Prefer green route</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_hazmat} onChange={e => setForm(f => ({ ...f, is_hazmat: e.target.checked }))} className="w-4 h-4 rounded" />
                <span className="text-sm text-slate-700">⚠️ Hazardous material</span>
              </label>
            </div>
          </div>
          <button onClick={() => setStep(1)} className="w-full bg-orange-500 hover:bg-orange-400 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
            Continue <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* Step 1 — Origin */}
      {step === 1 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-white">Origin Address</h2>
          {[["name","Full Name"],["company","Company (optional)"],["street1","Street Address"],["city","City"],["state","State/Province"],["zip","ZIP / Postal Code"]].map(([k,l]) => (
            <div key={k}><label className={labelCls}>{l}</label><input value={(form.origin_address as any)[k]} onChange={e => updateOrigin(k, e.target.value)} className={inputCls} placeholder={l} /></div>
          ))}
          <div><label className={labelCls}>Country (2-letter code)</label><input value={form.origin_address.country} onChange={e => updateOrigin("country", e.target.value.toUpperCase())} className={inputCls} maxLength={2} placeholder="US" /></div>
          <div className="flex gap-3">
            <button onClick={() => setStep(0)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-xl transition-colors">Back</button>
            <button onClick={() => setStep(2)} className="flex-1 bg-orange-500 hover:bg-orange-400 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">Continue <ArrowRight size={16} /></button>
          </div>
        </div>
      )}

      {/* Step 2 — Destination */}
      {step === 2 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-white">Destination Address</h2>
          {[["name","Recipient Name"],["company","Company (optional)"],["street1","Street Address"],["city","City"],["state","State/Province"],["zip","ZIP / Postal Code"]].map(([k,l]) => (
            <div key={k}><label className={labelCls}>{l}</label><input value={(form.destination_address as any)[k]} onChange={e => updateDest(k, e.target.value)} className={inputCls} placeholder={l} /></div>
          ))}
          <div><label className={labelCls}>Country (2-letter code)</label><input value={form.destination_address.country} onChange={e => updateDest("country", e.target.value.toUpperCase())} className={inputCls} maxLength={2} placeholder="GB" /></div>
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-xl transition-colors">Back</button>
            <button onClick={() => setStep(3)} className="flex-1 bg-orange-500 hover:bg-orange-400 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">Review <ArrowRight size={16} /></button>
          </div>
        </div>
      )}

      {/* Step 3 — Review */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-semibold text-white">Review Shipment</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                ["Contents", form.contents_description],
                ["Weight", `${form.weight_kg} kg`],
                ["Value", `$${form.declared_value}`],
                ["Priority", form.priority],
                ["From", `${form.origin_address.city}, ${form.origin_address.country}`],
                ["To", `${form.destination_address.city}, ${form.destination_address.country}`],
                ["Green Route", form.prefer_green ? "Yes 🌿" : "No"],
                ["Hazmat", form.is_hazmat ? "Yes ⚠️" : "No"],
              ].map(([k, v]) => (
                <div key={k} className="bg-slate-100 rounded-xl p-3">
                  <p className="text-xs text-slate-500">{k}</p>
                  <p className="text-white font-medium mt-0.5">{v}</p>
                </div>
              ))}
            </div>
          </div>

          {/* AI Processing indicator */}
          <div className="bg-blue-900/20 border border-blue-800/50 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <Bot size={20} className="text-blue-400" />
              <p className="text-sm font-semibold text-white">What happens next</p>
            </div>
            <div className="space-y-2">
              {["Compliance Agent checks HS codes & customs requirements","Router Agent selects optimal carrier & route","Negotiator Agent finds the best rate","Auto-executes if confidence ≥ 95%, or asks for your review"].map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-slate-700">
                  <span className="w-5 h-5 rounded-full bg-blue-800 text-blue-300 flex items-center justify-center font-bold shrink-0">{i+1}</span>
                  {s}
                </div>
              ))}
            </div>
          </div>

          {loading && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-3">
              <Loader2 size={20} className="animate-spin text-orange-400" />
              <div>
                <p className="text-sm font-medium text-white">Agents processing...</p>
                <p className="text-xs text-slate-500">{agentStep}</p>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep(2)} disabled={loading} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50">Back</button>
            <button onClick={handleSubmit} disabled={loading} className="flex-1 bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-400 hover:to-pink-500 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <><Loader2 size={16} className="animate-spin" /> Processing...</> : <><Bot size={16} /> Ship with AI</>}
            </button>
          </div>
        </div>
      )}

      {/* Step 4 — Success */}
      {step === 4 && result && (
        <div className="bg-white border border-green-800/50 rounded-2xl p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-900/40 flex items-center justify-center mx-auto">
            <CheckCircle size={32} className="text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Shipment Created!</h2>
          <p className="text-slate-500 text-sm">AI agents have processed your shipment</p>

          <div className="grid grid-cols-2 gap-3 text-sm mt-4">
            {[
              ["Carrier", result.selected_carrier || "Pending"],
              ["Status", result.status?.replace(/_/g," ")],
              ["AI Confidence", result.agent_confidence_score ? `${(result.agent_confidence_score*100).toFixed(0)}%` : "—"],
              ["Auto-Executed", result.auto_executed ? "Yes ✅" : "Needs Review ⚠️"],
            ].map(([k,v]) => (
              <div key={k} className="bg-slate-100 rounded-xl p-3 text-left">
                <p className="text-xs text-slate-500">{k}</p>
                <p className="text-white font-semibold mt-0.5">{v}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-3 mt-4">
            <button onClick={() => { setStep(0); setResult(null); setForm({ ...form, origin_address: { name:"",company:"",street1:"",city:"",state:"",zip:"",country:"US" }, destination_address: { name:"",company:"",street1:"",city:"",state:"",zip:"",country:"GB" } }); }}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-xl transition-colors">
              New Shipment
            </button>
            <button onClick={() => router.push("/vendor/shipments")}
              className="flex-1 bg-orange-500 hover:bg-orange-400 text-white font-semibold py-3 rounded-xl transition-colors">
              View All Shipments
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
