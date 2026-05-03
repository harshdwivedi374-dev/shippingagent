"use client";
import { BarChart } from "@mui/x-charts/BarChart";

interface Props {
  labels: string[];
  values: number[];
  colors?: string[];
}

export default function AgentDecisionBarChart({ labels, values, colors }: Props) {
  return (
    <BarChart
      xAxis={[{
        scaleType: "band",
        data: labels,
        tickLabelStyle: { fill: "#9ca3af", fontSize: 10 },
      }]}
      yAxis={[{
        tickLabelStyle: { fill: "#9ca3af", fontSize: 10 },
      }]}
      series={[{
        data: values,
        label: "Shipments",
        color: "#3b82f6",
        valueFormatter: (v: number | null) => `${v}`,
      }]}
      height={200}
      borderRadius={6}
      slotProps={{ legend: { hidden: true } as any }}
      sx={{
        "& .MuiChartsAxis-line": { stroke: "#374151" },
        "& .MuiChartsAxis-tick": { stroke: "#374151" },
        "& .MuiChartsGrid-line": { stroke: "#1f2937" },
        "& .MuiBarElement-root": {
          fill: "url(#barGrad)",
        },
      }}
      grid={{ horizontal: true }}
    />
  );
}
