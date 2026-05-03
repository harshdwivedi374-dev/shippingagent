"use client";
import { useEffect, useState } from "react";
import { escalationsApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, XCircle, Clock, Bot, ChevronDown, ChevronUp } from "lucide-react";
import { formatDate, getConfidenceColor } from "@/lib/utils";

export default function EscalationsPage() {
  const [escalations, setEscalations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [approving, setApproving] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await escalationsApi.list();
      setEscalations(res.data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const approve = async (id: string, option: string) => {
    setApproving(id + option);
    try {
      await escalationsApi.approve(id, { selected_option: option, human_notes: "Approved via dashboard" });
      await load();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to approve");
    } finally { setApproving(null); }
  };

  const reject = async (id: string) => {
    try {
      await escalationsApi.reject(id, "Rejected via dashboard");
      await load();
    } catch {}
  };

  const pending = escalations.filter(e => e.status === "pending");
  const resolved = escalations.filter(e => e.status !== "pending");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Human-in-the-Loop Escalations</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Shipments where agent confidence was 70–95%. Choose from 3 pre-calculated options.
        </p>
      </div>

      {/* Pending */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-orange-400" />
          <h3 className="text-sm font-semibold text-slate-900">Pending Review ({pending.length})</h3>
        </div>

        {pending.length === 0 && !loading && (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle size={32} className="text-green-400 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No pending escalations — agents are running autonomously</p>
            </CardContent>
          </Card>
        )}

        {pending.map((esc: any) => (
          <Card key={esc.id} className="border-orange-800/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-900/40 flex items-center justify-center">
                    <Bot size={16} className="text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Shipment Needs Review</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <Clock size={10} />
                      {formatDate(esc.created_at)}
                      {esc.expires_at && ` · Expires ${formatDate(esc.expires_at)}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-slate-500">AI Confidence</p>
                    <p className={`text-lg font-bold ${getConfidenceColor(esc.confidence_score)}`}>
                      {(esc.confidence_score * 100).toFixed(0)}%
                    </p>
                  </div>
                  <button onClick={() => setExpanded(expanded === esc.id ? null : esc.id)}
                    className="text-slate-500 hover:text-slate-900">
                    {expanded === esc.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="bg-orange-900/10 border border-orange-800/40 rounded-lg p-3">
                <p className="text-xs text-orange-300 font-medium mb-1">Reason for Escalation</p>
                <p className="text-sm text-slate-700">{esc.reason}</p>
              </div>

              {/* 3 Options */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { key: "A", data: esc.option_a, color: "border-blue-700 bg-blue-900/10" },
                  { key: "B", data: esc.option_b, color: "border-purple-700 bg-purple-900/10" },
                  { key: "C", data: esc.option_c, color: "border-green-700 bg-green-900/10" },
                ].map(({ key, data, color }) => data && (
                  <div key={key} className={`rounded-lg border p-4 ${color}`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-white bg-slate-700 px-2 py-0.5 rounded">Option {key}</span>
                    </div>
                    <div className="space-y-1 text-xs text-slate-700 mb-4">
                      {Object.entries(data).slice(0, 4).map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-2">
                          <span className="text-slate-400 capitalize">{k.replace(/_/g, " ")}</span>
                          <span className="font-medium text-right">{String(v)?.slice(0, 30)}</span>
                        </div>
                      ))}
                    </div>
                    <Button size="sm" variant="outline" className="w-full"
                      loading={approving === esc.id + key}
                      onClick={() => approve(esc.id, key)}>
                      Select Option {key}
                    </Button>
                  </div>
                ))}
              </div>

              {/* Reasoning log */}
              {expanded === esc.id && esc.agent_reasoning_log && (
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-xs font-semibold text-slate-500 mb-2">Agent Reasoning Log</p>
                  <pre className="text-xs text-slate-700 whitespace-pre-wrap overflow-auto max-h-48">
                    {JSON.stringify(esc.agent_reasoning_log, null, 2)}
                  </pre>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="danger" size="sm" onClick={() => reject(esc.id)}>
                  <XCircle size={14} /> Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Resolved */}
      {resolved.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-500">Resolved ({resolved.length})</h3>
          {resolved.map((esc: any) => (
            <div key={esc.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <p className="text-sm text-slate-700">Shipment {esc.shipment_id?.slice(0, 8)}...</p>
                <p className="text-xs text-slate-400">{formatDate(esc.created_at)}</p>
              </div>
              <Badge variant={esc.status === "approved" ? "success" : esc.status === "rejected" ? "danger" : "outline"}>
                {esc.status}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
