"use client";
import { LineChart } from "@mui/x-charts/LineChart";

interface Props {
  months: string[];
  values: number[];
  label?: string;
  color?: string;
}

export default function SpendLineChart({ months, values, label = "Spend ($)", color = "#f97316" }: Props) {
  if (!months.length) return (
    <div className="h-60 flex items-center justify-center text-slate-400 text-sm">No data yet</div>
  );

  return (
    <LineChart
      xAxis={[{
        scaleType: "point",
        data: months,
        tickLabelStyle: { fill: "#9ca3af", fontSize: 11 },
      }]}
      yAxis={[{
        tickLabelStyle: { fill: "#9ca3af", fontSize: 10 },
        valueFormatter: (v: number) => `$${v.toFixed(0)}`,
      }]}
      series={[{
        data: values,
        label,
        color,
        area: true,
        showMark: true,
        valueFormatter: (v: number | null) => `$${v?.toFixed(2)}`,
      }]}
      height={240}
      slotProps={{ legend: { hidden: true } as any }}
      sx={{
        "& .MuiChartsAxis-line":  { stroke: "#e2e8f0" },
        "& .MuiChartsAxis-tick":  { stroke: "#e2e8f0" },
        "& .MuiChartsGrid-line":  { stroke: "#f1f5f9" },
        "& .MuiAreaElement-root": { fillOpacity: 0.12 },
        "& .MuiLineElement-root": { strokeWidth: 2 },
        "& .MuiMarkElement-root": { strokeWidth: 2, r: 4 },
      }}
      grid={{ horizontal: true }}
    />
  );
}
