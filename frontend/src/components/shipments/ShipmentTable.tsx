"use client";
import { useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel, flexRender, createColumnHelper, SortingState } from "@tanstack/react-table";
import { useState } from "react";
import { Shipment } from "@/types";
import { formatCurrency, formatDate, getStatusColor, getConfidenceColor } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, ExternalLink, Bot } from "lucide-react";
import Link from "next/link";

const col = createColumnHelper<Shipment>();

const columns = [
  col.accessor("tracking_number", {
    header: "Tracking #",
    cell: info => (
      <span className="font-mono text-xs text-blue-400">{info.getValue() || "—"}</span>
    ),
  }),
  col.accessor("status", {
    header: "Status",
    cell: info => (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium text-white ${getStatusColor(info.getValue())}`}>
        {info.getValue().replace(/_/g, " ")}
      </span>
    ),
  }),
  col.accessor("origin_address", {
    header: "Origin",
    cell: info => <span className="text-xs text-slate-700">{info.getValue()?.city}, {info.getValue()?.country}</span>,
  }),
  col.accessor("destination_address", {
    header: "Destination",
    cell: info => <span className="text-xs text-slate-700">{info.getValue()?.city}, {info.getValue()?.country}</span>,
  }),
  col.accessor("selected_carrier", {
    header: "Carrier",
    cell: info => <span className="text-xs font-medium text-slate-900">{info.getValue() || "—"}</span>,
  }),
  col.accessor("quoted_rate", {
    header: "Rate",
    cell: info => <span className="text-xs text-green-400">{info.getValue() ? formatCurrency(info.getValue()!) : "—"}</span>,
  }),
  col.accessor("agent_confidence_score", {
    header: "AI Confidence",
    cell: info => {
      const v = info.getValue();
      if (!v) return <span className="text-xs text-slate-400">—</span>;
      return (
        <div className="flex items-center gap-1.5">
          <Bot size={12} className="text-blue-400" />
          <span className={`text-xs font-bold ${getConfidenceColor(v)}`}>{(v * 100).toFixed(0)}%</span>
        </div>
      );
    },
  }),
  col.accessor("auto_executed", {
    header: "Execution",
    cell: info => (
      <Badge variant={info.getValue() ? "success" : "warning"}>
        {info.getValue() ? "Auto" : "Manual"}
      </Badge>
    ),
  }),
  col.accessor("is_green_route", {
    header: "Green",
    cell: info => info.getValue() ? <span className="text-green-400 text-sm">🌿</span> : <span className="text-slate-500 text-sm">—</span>,
  }),
  col.accessor("created_at", {
    header: "Created",
    cell: info => <span className="text-xs text-slate-500">{formatDate(info.getValue())}</span>,
  }),
  col.accessor("id", {
    header: "",
    cell: info => (
      <Link href={`/shipments/${info.getValue()}`} className="text-slate-400 hover:text-blue-400 transition-colors">
        <ExternalLink size={14} />
      </Link>
    ),
  }),
];

export default function ShipmentTable({ data }: { data: Shipment[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <div className="p-3 border-b border-slate-200 flex items-center justify-between">
        <input
          value={globalFilter}
          onChange={e => setGlobalFilter(e.target.value)}
          placeholder="Filter shipments..."
          className="bg-slate-100 border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 w-64"
        />
        <span className="text-xs text-slate-400">{table.getFilteredRowModel().rows.length} shipments</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id} className="border-b border-slate-200 bg-white">
                {hg.headers.map(h => (
                  <th key={h.id} className="px-4 py-3 text-left text-xs font-medium text-slate-500 whitespace-nowrap">
                    <div className="flex items-center gap-1 cursor-pointer select-none"
                      onClick={h.column.getToggleSortingHandler()}>
                      {flexRender(h.column.columnDef.header, h.getContext())}
                      {h.column.getCanSort() && <ArrowUpDown size={12} className="text-slate-500" />}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-slate-400">
                  No shipments found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
