"use client";
import { useEffect, useState } from "react";
import { shipmentsApi } from "@/lib/api";
import { formatCurrency, formatDate, getStatusColor, getConfidenceColor } from "@/lib/utils";
import { Package, Bot, Leaf, ExternalLink, Search } from "lucide-react";
import Link from "next/link";

const STATUS_FILTERS = ["all","delivered","in_transit","label_created","awaiting_approval","exception","picked_up"];

export default function VendorShipments() {
  const [shipments, setShipments] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    shipmentsApi.list({ limit: 100 }).then(r => setShipments(r.data.items || [])).finally(() => setLoading(false));
  }, []);

  const filtered = shipments.filter(s => {
    const matchStatus = filter === "all" || s.status === filter;
    const matchSearch = !search || [s.tracking_number, s.contents_description, s.origin_address?.city, s.destination_address?.city, s.selected_carrier].some(v => v?.toLowerCase().includes(search.toLowerCase()));
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">My Shipments</h1>
          <p className="text-sm text-slate-500 mt-0.5">{shipments.length} total shipments</p>
        </div>
        <Link href="/vendor/new" className="bg-orange-500 hover:bg-orange-400 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors flex items-center gap-2">
          <Package size={15} /> New Shipment
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
            className="bg-slate-100 border border-slate-300 rounded-xl pl-8 pr-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 w-48" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {STATUS_FILTERS.map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === s ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
              {s === "all" ? "All" : s.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Package size={32} className="text-slate-500 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No shipments found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-white">
                  {["Tracking #","Route","Contents","Carrier","Rate","AI","Status","Green","Date",""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3"><span className="font-mono text-xs text-orange-400">{s.tracking_number?.slice(0,14) || "—"}</span></td>
                    <td className="px-4 py-3"><p className="text-xs text-white">{s.origin_address?.city} → {s.destination_address?.city}</p><p className="text-xs text-slate-400">{s.origin_address?.country} → {s.destination_address?.country}</p></td>
                    <td className="px-4 py-3"><span className="text-xs text-slate-700">{s.contents_description?.slice(0,20)}</span></td>
                    <td className="px-4 py-3"><span className="text-xs font-medium text-white">{s.selected_carrier || "—"}</span></td>
                    <td className="px-4 py-3"><span className="text-xs text-green-400 font-semibold">{s.quoted_rate ? formatCurrency(s.quoted_rate) : "—"}</span></td>
                    <td className="px-4 py-3">
                      {s.agent_confidence_score ? (
                        <div className="flex items-center gap-1">
                          <Bot size={11} className="text-blue-400" />
                          <span className={`text-xs font-bold ${getConfidenceColor(s.agent_confidence_score)}`}>{(s.agent_confidence_score*100).toFixed(0)}%</span>
                        </div>
                      ) : <span className="text-xs text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full text-white font-medium ${getStatusColor(s.status)}`}>
                        {s.status.replace(/_/g," ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">{s.is_green_route ? "🌿" : "—"}</td>
                    <td className="px-4 py-3"><span className="text-xs text-slate-500">{formatDate(s.created_at)}</span></td>
                    <td className="px-4 py-3">
                      <Link href={`/vendor/tracking?id=${s.id}`} className="text-slate-400 hover:text-orange-400 transition-colors">
                        <ExternalLink size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
