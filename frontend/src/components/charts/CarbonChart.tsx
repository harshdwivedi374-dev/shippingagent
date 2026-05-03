"use client";
import { BarChart } from "@mui/x-charts/BarChart";
import ClientOnly from "./ClientOnly";

interface Props {
  modes:     string[];
  emissions: number[];
}

const COLORS = ["#ef4444","#f97316","#eab308","#22c55e","#06b6d4","#3b82f6"];

export default function CarbonChart({ modes, emissions }: Props) {
  return (
    <ClientOnly>
    <BarChart
      xAxis={[{
        scaleType: "band",
        data: modes.map(m => m.replace(/_/g, " ")),
        tickLabelStyle: { fill: "#9ca3af", fontSize: 10 },
      }]}
      yAxis={[{
        tickLabelStyle: { fill: "#9ca3af", fontSize: 10 },
        valueFormatter: (v: number | null) => `${v}`,
      }]}
      series={[{
        data: emissions,
        label: "kg CO₂ / tonne-km",
        color: "#22c55e",
        valueFormatter: (v: number | null) => `${v} kg`,
      }]}
      height={220}
      borderRadius={6}
      slotProps={{ legend: { hidden: true } as any }}
      sx={{
        "& .MuiChartsAxis-line": { stroke: "#e2e8f0" },
        "& .MuiChartsAxis-tick": { stroke: "#e2e8f0" },
        "& .MuiChartsGrid-line": { stroke: "#f1f5f9" },
      }}
      grid={{ horizontal: true }}
    />
    </ClientOnly>
  );
}
