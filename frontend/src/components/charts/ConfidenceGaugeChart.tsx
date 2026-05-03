"use client";
import { GaugeContainer, GaugeValueArc, GaugeReferenceArc, useGaugeState } from "@mui/x-charts/Gauge";
import ClientOnly from "./ClientOnly";

function GaugePointer() {
  const { valueAngle, outerRadius, cx, cy } = useGaugeState();
  if (valueAngle === null) return null;
  const target = {
    x: cx + outerRadius * Math.sin(valueAngle),
    y: cy - outerRadius * Math.cos(valueAngle),
  };
  return (
    <g>
      <circle cx={cx} cy={cy} r={5} fill="#3b82f6" />
      <path d={`M ${cx} ${cy} L ${target.x} ${target.y}`}
        stroke="#3b82f6" strokeWidth={3} strokeLinecap="round" />
    </g>
  );
}

interface Props {
  value: number; // 0–100
  label?: string;
}

export default function ConfidenceGaugeChart({ value, label = "Avg AI Confidence" }: Props) {
  const color = value >= 95 ? "#22c55e" : value >= 70 ? "#f97316" : "#ef4444";

  return (
    <div className="flex flex-col items-center">
      <ClientOnly>
      <GaugeContainer
        width={200} height={130}
        startAngle={-110} endAngle={110}
        value={value}
        sx={{
          "& .MuiGauge-referenceArc": { fill: "#1f2937" },
          "& .MuiGauge-valueArc":     { fill: color },
        }}
      >
        <GaugeReferenceArc />
        <GaugeValueArc />
        <GaugePointer />
      </GaugeContainer>
      </ClientOnly>
      <p className="text-2xl font-black mt-1" style={{ color }}>{value.toFixed(0)}%</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}
