"use client";
import { useEffect, useState } from "react";
import { shipmentsApi, trackingApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, RefreshCw, Package, Clock, AlertTriangle } from "lucide-react";
import { formatDate, getStatusColor } from "@/lib/utils";

export default function TrackingPage() {
  const [shipments, setShipments] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    shipmentsApi.list({ status: "in_transit", limit: 50 }).then(r => {
      const items = r.data.items || [];
      setShipments(items);
      if (items.length > 0) selectShipment(items[0]);
    });
  }, []);

  const selectShipment = async (s: any) => {
    setSelected(s);
    setLoading(true);
    try {
      const [evRes, exRes] = await Promise.all([
        trackingApi.events(s.id),
        trackingApi.exceptions(s.id),
      ]);
      setEvents(evRes.data || []);
      setExceptions(exRes.data || []);
    } catch {}
    finally { setLoading(false); }
  };

  const eventIcons: Record<string, string> = {
    label_created: "🏷️", picked_up: "📦", in_transit: "🚚",
    out_for_delivery: "🛵", delivered: "✅", exception: "⚠️",
    delay_detected: "⏰", rerouted: "🔄", customs_hold: "🛃", weather_delay: "🌧️",
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Live Tracking</h2>
        <p className="text-sm text-slate-500 mt-0.5">Real-time shipment status and exception monitoring</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Shipment List */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Package size={16} className="text-blue-400" /> Active Shipments</CardTitle></CardHeader>
          <CardContent className="p-0">
            {shipments.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-400">No in-transit shipments</div>
            ) : (
              <div className="divide-y divide-gray-800">
                {shipments.map(s => (
                  <button key={s.id} onClick={() => selectShipment(s)}
                    className={`w-full text-left p-4 hover:bg-slate-50 transition-colors ${selected?.id === s.id ? "bg-blue-900/20 border-l-2 border-blue-500" : ""}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-blue-400">{s.tracking_number || s.id.slice(0, 8)}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded text-white ${getStatusColor(s.status)}`}>
                        {s.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="text-sm text-white">{s.origin_address?.city} → {s.destination_address?.city}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{s.selected_carrier || "No carrier"}</p>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tracking Detail */}
        <div className="lg:col-span-2 space-y-4">
          {selected ? (
            <>
              {/* Shipment Info */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Shipment Details</CardTitle>
                    <Button size="sm" variant="ghost" onClick={() => selectShipment(selected)} loading={loading}>
                      <RefreshCw size={14} /> Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: "Carrier", value: selected.selected_carrier || "—" },
                      { label: "Service", value: selected.selected_service || "—" },
                      { label: "Weight", value: `${selected.weight_kg}kg` },
                      { label: "Rate", value: selected.quoted_rate ? `$${selected.quoted_rate.toFixed(2)}` : "—" },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-xs text-slate-500">{label}</p>
                        <p className="text-sm font-medium text-white mt-0.5">{value}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Exceptions */}
              {exceptions.length > 0 && (
                <Card className="border-red-800/50">
                  <CardHeader><CardTitle className="flex items-center gap-2 text-red-400"><AlertTriangle size={16} /> Active Exceptions ({exceptions.length})</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {exceptions.map((ex: any) => (
                      <div key={ex.id} className="p-3 bg-red-900/10 border border-red-800/40 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-white">{ex.exception_type}</span>
                          <Badge variant={ex.severity === "critical" ? "danger" : ex.severity === "high" ? "warning" : "outline"}>
                            {ex.severity}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500">{ex.description}</p>
                        {ex.agent_action_taken && (
                          <p className="text-xs text-blue-400 mt-1">🤖 Agent: {ex.agent_action_taken}</p>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Timeline */}
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Clock size={16} className="text-blue-400" /> Tracking Timeline</CardTitle></CardHeader>
                <CardContent>
                  {events.length === 0 ? (
                    <div className="text-center py-6 text-sm text-slate-400">
                      No tracking events yet
                      {!selected.tracking_number && " — label not created"}
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-700" />
                      <div className="space-y-4">
                        {events.map((ev: any, i) => (
                          <div key={ev.id} className="flex gap-4 relative">
                            <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-slate-300 flex items-center justify-center shrink-0 z-10 text-sm">
                              {eventIcons[ev.event_type] || "📍"}
                            </div>
                            <div className="flex-1 pb-4">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-white capitalize">
                                  {ev.event_type.replace(/_/g, " ")}
                                </p>
                                <span className="text-xs text-slate-400">{formatDate(ev.occurred_at)}</span>
                              </div>
                              {ev.description && <p className="text-xs text-slate-500 mt-0.5">{ev.description}</p>}
                              {ev.location && (
                                <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                  <MapPin size={10} /> {ev.location}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-16 text-center">
                <Package size={40} className="text-slate-500 mx-auto mb-3" />
                <p className="text-slate-500">Select a shipment to view tracking details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
