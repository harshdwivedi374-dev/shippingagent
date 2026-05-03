"use client";
import { PieChart } from "@mui/x-charts/PieChart";

interface Props {
  data: { status: string; count: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  delivered:         "#22c55e",
  in_transit:        "#3b82f6",
  label_created:     "#06b6d4",
  awaiting_approval: "#f97316",
  exception:         "#ef4444",
  agent_processing:  "#8b5cf6",
  pending_agent:     "#eab308",
  picked_up:         "#6366f1",
  out_for_delivery:  "#a855f7",
  cancelled:         "#6b7280",
  returned:          "#dc2626",
};

export default function ShipmentStatusChart({ data }: Props) {
  if (!data.length) return (
    <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
      No data yet — create some shipments
    </div>
  );

  return (
    <PieChart
      series={[{
        data: data.map((d, i) => ({
          id:    i,
          value: d.count,
          label: d.status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
          color: STATUS_COLORS[d.status] || "#6b7280",
        })),
        innerRadius: 55,
        outerRadius: 100,
        paddingAngle: 3,
        cornerRadius: 5,
        highlightScope: { fade: "global", highlight: "item" },
      }]}
      height={260}
      sx={{
        "& .MuiPieArc-root":           { stroke: "#111827", strokeWidth: 2 },
        "& .MuiChartsLegend-label":    { fill: "#9ca3af", fontSize: "11px" },
        "& .MuiChartsLegend-root":     { transform: "translateX(-10px)" },
      }}
    />
  );
}
