"use client";
import { useState } from "react";
import { documentsApi } from "@/lib/api";
import { FileText, Upload, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";

export default function VendorDocuments() {
  const [ocrResult, setOcrResult] = useState<any>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const handleFile = async (type: "address" | "invoice" | "package", file: File) => {
    setLoading(type); setOcrResult(null);
    try {
      const res = type === "address" ? await documentsApi.ocrAddress(file)
        : type === "invoice" ? await documentsApi.ocrInvoice(file)
        : await documentsApi.scanPackage(file);
      setOcrResult({ type, data: res.data });
    } catch (err: any) {
      setOcrResult({ type, error: err.response?.data?.detail || err.message });
    } finally { setLoading(null); }
  };

  const docTypes = [
    { key: "address", label: "Handwritten Label / Address", desc: "Upload a photo of a handwritten shipping label. AI extracts the address.", icon: "🏷️", accept: "image/*" },
    { key: "invoice", label: "Commercial Invoice", desc: "Upload a scanned invoice. AI extracts all customs fields.", icon: "📄", accept: "image/*,application/pdf" },
    { key: "package", label: "Package Scan (Dark Warehouse)", desc: "Upload a package photo. AI estimates dimensions and checks for damage.", icon: "📦", accept: "image/*" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Documents & OCR</h1>
        <p className="text-sm text-slate-500 mt-0.5">AI reads handwritten labels, invoices, and scans packages automatically</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {docTypes.map(({ key, label, desc, icon, accept }) => (
          <div key={key} className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="text-3xl mb-3">{icon}</div>
            <h3 className="text-sm font-semibold text-white mb-1">{label}</h3>
            <p className="text-xs text-slate-500 mb-4">{desc}</p>
            <label className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-colors ${loading === key ? "bg-gray-700 text-slate-500" : "bg-orange-500/20 border border-orange-700 text-orange-400 hover:bg-orange-500/30"}`}>
              {loading === key ? <><Loader2 size={15} className="animate-spin" /> Processing...</> : <><Upload size={15} /> Upload File</>}
              <input type="file" accept={accept} className="hidden" disabled={!!loading}
                onChange={e => e.target.files?.[0] && handleFile(key as any, e.target.files[0])} />
            </label>
          </div>
        ))}
      </div>

      {/* Result */}
      {ocrResult && (
        <div className={`bg-white border rounded-2xl p-5 ${ocrResult.error ? "border-red-800/50" : "border-green-800/50"}`}>
          <div className="flex items-center gap-2 mb-4">
            {ocrResult.error ? <AlertTriangle size={18} className="text-red-400" /> : <CheckCircle size={18} className="text-green-400" />}
            <p className="text-sm font-semibold text-white">
              {ocrResult.error ? "OCR Failed" : `${ocrResult.type === "address" ? "Address" : ocrResult.type === "invoice" ? "Invoice" : "Package"} Extracted`}
            </p>
          </div>

          {ocrResult.error ? (
            <p className="text-sm text-red-300">{ocrResult.error}</p>
          ) : (
            <pre className="text-xs text-slate-700 whitespace-pre-wrap bg-slate-100 rounded-xl p-4 overflow-auto max-h-64">
              {JSON.stringify(ocrResult.data, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-900/10 border border-blue-800/40 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <FileText size={18} className="text-blue-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-white mb-1">How AI Document Processing Works</p>
            <ul className="text-xs text-slate-500 space-y-1">
              <li>• <strong className="text-slate-700">Handwritten labels</strong> — OCR extracts name, address, city, zip, country</li>
              <li>• <strong className="text-slate-700">Commercial invoices</strong> — AI reads shipper, consignee, value, HS codes</li>
              <li>• <strong className="text-slate-700">Package scans</strong> — Computer vision estimates dimensions and detects damage</li>
              <li>• <strong className="text-slate-700">Compliance check</strong> — Extracted data is automatically validated against trade regulations</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
