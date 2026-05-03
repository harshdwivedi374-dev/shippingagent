"use client";
import { PieChart } from "@mui/x-charts/PieChart";
import ClientOnly from "./ClientOnly";

interface Props {
  data: { carrier: string; count: number }[];
}

const COLORS = ["#3b82f6","#f97316","#22c55e","#8b5cf6","#06b6d4","#eab308"];

export default function CarrierPieChart({ data }: Props) {
  if (!data.length) return (
    <div className="h-60 flex items-center justify-center text-slate-400 text-sm">No data yet</div>
  );

  return (
    <ClientOnly>
    <PieChart
      series={[{
        data: data.map((d, i) => ({
          id:    i,
          value: d.count,
          label: d.carrier,
          color: COLORS[i % COLORS.length],
        })),
        innerRadius: 50,
        outerRadius: 95,
        paddingAngle: 3,
        cornerRadius: 5,
        highlightScope: { fade: "global", highlight: "item" },
      }]}
      height={240}
      sx={{
        "& .MuiPieArc-root":        { stroke: "#111827", strokeWidth: 2 },
        "& .MuiChartsLegend-label": { fill: "#9ca3af", fontSize: "11px" },
        "& .MuiChartsLegend-root":  { transform: "translateX(-10px)" },
      }}
    />
    </ClientOnly>
  );
}
