"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/store/useStore";
import { cn } from "@/lib/utils";
import Image from "next/image";
import {
  LayoutDashboard, Package, AlertTriangle, Map,
  FileText, Bot, Leaf, LogOut, ChevronLeft, ChevronRight,
} from "lucide-react";
import Logo from "@/components/ui/Logo";

const navItems = [
  { href: "/dashboard",    label: "Dashboard",     icon: LayoutDashboard },
  { href: "/shipments",    label: "Shipments",      icon: Package         },
  { href: "/escalations",  label: "Escalations",    icon: AlertTriangle, badge: true },
  { href: "/tracking",     label: "Live Tracking",  icon: Map             },
  { href: "/agents",       label: "Agent Console",  icon: Bot             },
  { href: "/analytics",    label: "Analytics",      icon: FileText        },
  { href: "/sustainability",label: "Sustainability", icon: Leaf            },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen, pendingEscalations, user, logout } = useStore();

  return (
    <aside className={cn(
      "flex flex-col h-screen bg-white border-r border-slate-200 transition-all duration-300 shrink-0 shadow-sm",
      sidebarOpen ? "w-56" : "w-16"
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-100 min-h-[72px]">
        {sidebarOpen ? (
          <Logo size="sm" href="/dashboard" />
        ) : (
          <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 shadow shadow-blue-200">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
              <path d="M20 7H4C2.9 7 2 7.9 2 9v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2z" fill="white" fillOpacity="0.9"/>
              <path d="M16 7V5c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M2 12h20" stroke="white" strokeWidth="1" strokeOpacity="0.4"/>
            </svg>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon, badge }) => {
          const active = pathname.startsWith(href);
          return (
            <Link key={href} href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors relative",
                active
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}>
              <Icon size={18} className={cn("shrink-0", active ? "text-blue-600" : "text-slate-400")} />
              {sidebarOpen && <span>{label}</span>}
              {badge && pendingEscalations > 0 && (
                <span className={cn(
                  "bg-red-500 text-white text-xs rounded-full font-bold",
                  sidebarOpen
                    ? "ml-auto px-1.5 py-0.5"
                    : "absolute top-1 right-1 w-4 h-4 flex items-center justify-center text-[10px]"
                )}>
                  {pendingEscalations}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User + collapse */}
      <div className="border-t border-slate-100 p-3 space-y-1">
        {sidebarOpen && user && (
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {user.full_name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800 truncate">{user.full_name}</p>
              <p className="text-xs text-slate-400 capitalize">{user.role}</p>
            </div>
          </div>
        )}
        <button onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors">
          <LogOut size={16} className="shrink-0" />
          {sidebarOpen && <span>Logout</span>}
        </button>
        <button onClick={() => setSidebarOpen(!sidebarOpen)}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-50 transition-colors">
          {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          {sidebarOpen && <span className="text-xs">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
