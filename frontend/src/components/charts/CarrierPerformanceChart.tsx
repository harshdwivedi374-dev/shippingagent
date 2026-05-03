"use client";
import { BarChart } from "@mui/x-charts/BarChart";

interface Props {
  carriers:    string[];
  onTimeRates: number[];
  avgDelays:   number[];
}

export default function CarrierPerformanceChart({ carriers, onTimeRates }: Props) {
  return (
    <BarChart
      xAxis={[{
        scaleType: "band",
        data: carriers,
        tickLabelStyle: { fill: "#9ca3af", fontSize: 11 },
      }]}
      yAxis={[{
        min: 0, max: 100,
        tickLabelStyle: { fill: "#9ca3af", fontSize: 10 },
        valueFormatter: (v: number) => `${v}%`,
      }]}
      series={[{
        data: onTimeRates.map(v => Math.round(v * 100)),
        label: "On-Time Rate (%)",
        color: "#3b82f6",
        valueFormatter: (v: number | null) => `${v?.toFixed(1)}%`,
      }]}
      height={260}
      borderRadius={6}
      slotProps={{ legend: { hidden: true } as any }}
      sx={{
        "& .MuiChartsAxis-line":       { stroke: "#e2e8f0" },
        "& .MuiChartsAxis-tick":       { stroke: "#e2e8f0" },
        "& .MuiChartsGrid-line":       { stroke: "#f1f5f9" },
        "& .MuiBarElement-root:hover": { opacity: 0.8 },
      }}
      grid={{ horizontal: true }}
    />
  );
}
