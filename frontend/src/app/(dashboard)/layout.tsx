"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/store/useStore";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import { escalationsApi } from "@/lib/api";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { token, setPendingEscalations } = useStore();

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    const fetchEscalations = async () => {
      try {
        const res = await escalationsApi.list({ status: "pending" });
        setPendingEscalations(res.data.length);
      } catch {}
    };
    fetchEscalations();
    const interval = setInterval(fetchEscalations, 30000);
    return () => clearInterval(interval);
  }, [token]);

  if (!token) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        <TopBar title="AgenticShip" />
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
}
