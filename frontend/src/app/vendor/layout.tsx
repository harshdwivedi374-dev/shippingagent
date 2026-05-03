"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useStore } from "@/store/useStore";
import Link from "next/link";
import Image from "next/image";
import { Package, BarChart2, FileText, Truck, LogOut, Bot, Home, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import Logo from "@/components/ui/Logo";

const nav = [
  { href: "/vendor", label: "Overview", icon: Home },
  { href: "/vendor/shipments", label: "My Shipments", icon: Package },
  { href: "/vendor/new", label: "New Shipment", icon: PlusCircle },
  { href: "/vendor/tracking", label: "Track Orders", icon: Truck },
  { href: "/vendor/reports", label: "Reports", icon: BarChart2 },
  { href: "/vendor/documents", label: "Documents", icon: FileText },
];

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { token, user, logout } = useStore();

  useEffect(() => {
    if (!token) router.push("/vendor/login");
  }, [token]);

  if (!token) return null;

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-slate-200 flex flex-col">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            {/* Vendor-tinted icon */}
            <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center bg-gradient-to-br from-orange-500 to-pink-600 shadow-lg shadow-orange-600/30">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                <path d="M20 7H4C2.9 7 2 7.9 2 9v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2z" fill="white" fillOpacity="0.9"/>
                <path d="M16 7V5c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M2 12h20" stroke="white" strokeWidth="1" strokeOpacity="0.4"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-none">Vendor Portal</p>
              <p className="text-xs text-orange-400 mt-0.5">FastShip Network</p>
            </div>
          </div>
        </div>

        {/* AI Status */}
        <div className="mx-3 mt-3 p-3 bg-blue-900/20 border border-blue-800/50 rounded-xl">
          <div className="flex items-center gap-2">
            <Bot size={14} className="text-blue-400" />
            <span className="text-xs text-blue-300 font-medium">AI Agent Active</span>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse ml-auto" />
          </div>
          <p className="text-xs text-slate-400 mt-1">Auto-processing your shipments</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                active ? "bg-orange-500/20 text-orange-400 font-medium" : "text-slate-500 hover:bg-slate-100 hover:text-white"
              )}>
                <Icon size={17} className="shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-xs font-bold text-white">
              {user?.full_name?.[0] || "V"}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-white truncate">{user?.full_name || "Vendor"}</p>
              <p className="text-xs text-slate-400">{user?.email}</p>
            </div>
          </div>
          <button onClick={() => { logout(); router.push("/vendor/login"); }}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-slate-500 hover:bg-slate-100 hover:text-red-400 transition-colors">
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
