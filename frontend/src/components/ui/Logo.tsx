"use client";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  href?: string;
  className?: string;
}

export default function Logo({ size = "md", href = "/dashboard", className }: LogoProps) {
  const sizes = {
    sm: { icon: "w-7 h-7",  text: "text-sm",  sub: "text-[10px]" },
    md: { icon: "w-10 h-10", text: "text-base", sub: "text-xs"   },
    lg: { icon: "w-12 h-12", text: "text-xl",  sub: "text-sm"   },
  };
  const s = sizes[size];

  const content = (
    <div className={cn("flex items-center gap-3", className)}>
      <div className={cn(
        "rounded-xl shrink-0 flex items-center justify-center",
        "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-200",
        s.icon
      )}>
        <svg viewBox="0 0 24 24" fill="none" className="w-[55%] h-[55%]">
          <path d="M20 7H4C2.9 7 2 7.9 2 9v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2z" fill="white" fillOpacity="0.9"/>
          <path d="M16 7V5c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M12 12v4M10 14h4" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M2 12h20" stroke="white" strokeWidth="1" strokeOpacity="0.4"/>
        </svg>
      </div>
      <div>
        <p className={cn("font-bold text-slate-800 leading-none tracking-tight", s.text)}>
          AgenticShip
        </p>
        <p className={cn("text-blue-500 font-medium mt-0.5 leading-none", s.sub)}>
          AI Logistics Platform
        </p>
      </div>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
