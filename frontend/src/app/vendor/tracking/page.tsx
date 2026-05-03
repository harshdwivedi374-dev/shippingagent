"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { shipmentsApi, trackingApi } from "@/lib/api";
import { formatDate, getStatusColor } from "@/lib/utils";
import { MapPin, Package, Clock, AlertTriangle, CheckCircle, Truck } from "lucide-react";

function TrackingContent() {
  const params = useSearchParams();
  const id = params.get("id");
  const [shipments, setShipments] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [exceptions, setExceptions] = useState<any[]>([]);

  useEffect(() => {
    shipmentsApi.list({ limit: 50 }).then(r => {
      const items = r.data.items || [];
      setShipments(items);
      const target = id ? items.find((s: any) => s.id === id) : items[0];
      if (target) loadShipment(target);
    });
  }, [id]);

  const loadShipment = async (s: any) => {
    setSelected(s);
    const [ev, ex] = await Promise.all([trackingApi.events(s.id), trackingApi.exceptions(s.id)]);
    setEvents(ev.data || []);
    setExceptions(ex.data || []);
  };

  const icons: Record<string, any> = {
    label_created: Package, picked_up: Truck, in_transit: Truck,
    out_for_delivery: MapPin, delivered: CheckCircle, exception: AlertTriangle,
  };

  const statusSteps = ["label_created","picked_up","in_transit","out_for_delivery","delivered"];
  const currentStep = selected ? statusSteps.indexOf(selected.status) : -1;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-900">Track Orders</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Shipment list */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200">
            <p className="text-sm font-semibold text-slate-900">Your Shipments</p>
          </div>
          <div className="divide-y divide-gray-800 max-h-[500px] overflow-y-auto">
            {shipments.map(s => (
              <button key={s.id} onClick={() => loadShipment(s)}
                className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${selected?.id === s.id ? "bg-orange-900/20 border-l-2 border-orange-500" : ""}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono text-orange-400">{s.tracking_number?.slice(0,14) || s.id.slice(0,8)}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded text-white ${getStatusColor(s.status)}`}>{s.status.replace(/_/g," ")}</span>
                </div>
                <p className="text-sm text-slate-900">{s.origin_address?.city} → {s.destination_address?.city}</p>
                <p className="text-xs text-slate-500">{s.selected_carrier || "Pending"} · {s.weight_kg}kg</p>
              </button>
            ))}
          </div>
        </div>

        {/* Detail */}
        <div className="lg:col-span-2 space-y-4">
          {selected ? (
            <>
              {/* Progress bar */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-slate-900">{selected.origin_address?.city} → {selected.destination_address?.city}</p>
                  <span className={`text-xs px-2.5 py-1 rounded-full text-white font-medium ${getStatusColor(selected.status)}`}>
                    {selected.status.replace(/_/g," ")}
                  </span>
                </div>

                {/* Step progress */}
                <div className="flex items-center gap-1">
                  {statusSteps.map((step, i) => {
                    const done = i <= currentStep;
                    const active = i === currentStep;
                    const Icon = icons[step] || Package;
                    return (
                      <div key={step} className="flex items-center flex-1">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${done ? "bg-green-500" : "bg-gray-700"} ${active ? "ring-2 ring-green-400 ring-offset-2 ring-offset-gray-900" : ""}`}>
                          <Icon size={14} className="text-white" />
                        </div>
                        {i < statusSteps.length - 1 && <div className={`flex-1 h-1 mx-1 rounded ${i < currentStep ? "bg-green-500" : "bg-gray-700"}`} />}
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-2">
                  {statusSteps.map(s => <span key={s} className="text-xs text-slate-400 capitalize">{s.replace(/_/g," ")}</span>)}
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-3 gap-3 mt-4">
                  {[
                    ["Carrier", selected.selected_carrier || "—"],
                    ["Service", selected.selected_service || "—"],
                    ["Est. Delivery", selected.estimated_delivery ? formatDate(selected.estimated_delivery) : "—"],
                  ].map(([k,v]) => (
                    <div key={k} className="bg-slate-100 rounded-xl p-3">
                      <p className="text-xs text-slate-500">{k}</p>
                      <p className="text-sm font-medium text-slate-900 mt-0.5">{v}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Exceptions */}
              {exceptions.length > 0 && (
                <div className="bg-red-900/10 border border-red-800/50 rounded-2xl p-4 space-y-2">
                  <p className="text-sm font-semibold text-red-400 flex items-center gap-2"><AlertTriangle size={15} /> Active Issues</p>
                  {exceptions.map((ex: any) => (
                    <div key={ex.id} className="text-sm">
                      <p className="text-slate-900 font-medium">{ex.exception_type}: {ex.description}</p>
                      {ex.agent_action_taken && <p className="text-xs text-blue-400 mt-0.5">🤖 {ex.agent_action_taken}</p>}
                    </div>
                  ))}
                </div>
              )}

              {/* Timeline */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <p className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2"><Clock size={15} className="text-orange-400" /> Tracking History</p>
                {events.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">No tracking events yet</p>
                ) : (
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-700" />
                    <div className="space-y-4">
                      {events.map((ev: any) => {
                        const Icon = icons[ev.event_type] || Package;
                        return (
                          <div key={ev.id} className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-slate-300 flex items-center justify-center shrink-0 z-10">
                              <Icon size={14} className="text-orange-400" />
                            </div>
                            <div className="flex-1 pb-3">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-slate-900 capitalize">{ev.event_type.replace(/_/g," ")}</p>
                                <span className="text-xs text-slate-400">{formatDate(ev.occurred_at)}</span>
                              </div>
                              {ev.description && <p className="text-xs text-slate-500 mt-0.5">{ev.description}</p>}
                              {ev.location && <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><MapPin size={10} />{ev.location}</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl py-16 text-center">
              <Package size={40} className="text-slate-500 mx-auto mb-3" />
              <p className="text-slate-500">Select a shipment to track</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VendorTracking() {
  return <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>}><TrackingContent /></Suspense>;
}
