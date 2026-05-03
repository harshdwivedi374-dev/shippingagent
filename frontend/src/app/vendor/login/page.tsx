"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import { useStore } from "@/store/useStore";
import { Truck, Bot, Zap, Shield, Leaf } from "lucide-react";
import Image from "next/image";
import Logo from "@/components/ui/Logo";

export default function VendorLoginPage() {
  const router = useRouter();
  const setAuth = useStore(s => s.setAuth);
  const [email, setEmail] = useState("vendor@fastship.com");
  const [password, setPassword] = useState("Vendor1234");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await authApi.login(email, password);
      const { access_token } = res.data;
      const payload = JSON.parse(atob(access_token.split(".")[1]));
      setAuth({ id: payload.sub, email: payload.email, full_name: "FastShip Vendor", role: payload.role }, access_token);
      router.push("/vendor");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Login failed");
    } finally { setLoading(false); }
  };

  const features = [
    { icon: Bot, label: "AI Auto-Processing", desc: "Agents handle compliance, routing & rates" },
    { icon: Zap, label: "Instant Rate Quotes", desc: "Multi-carrier comparison in milliseconds" },
    { icon: Shield, label: "Zero-Trust Compliance", desc: "Automatic customs document validation" },
    { icon: Leaf, label: "Green Shipping", desc: "Carbon-optimized route selection" },
  ];

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left — Branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-gray-900 via-orange-950/20 to-gray-900 p-12 border-r border-slate-200">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center bg-gradient-to-br from-orange-500 to-pink-600 shadow-lg shadow-orange-600/30">
              <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
                <path d="M20 7H4C2.9 7 2 7.9 2 9v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2z" fill="white" fillOpacity="0.9"/>
                <path d="M16 7V5c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M2 12h20" stroke="white" strokeWidth="1" strokeOpacity="0.4"/>
              </svg>
            </div>
            <div>
              <p className="text-xl font-bold text-white leading-none">FastShip Vendor Portal</p>
              <p className="text-sm text-orange-400 mt-0.5">Powered by AgenticShip AI</p>
            </div>
          </div>

          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Ship smarter with<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-400">
              AI-powered logistics
            </span>
          </h1>
          <p className="text-slate-500 text-lg mb-10">
            Our agents handle compliance, routing, and rate negotiation automatically — so you can focus on your business.
          </p>

          <div className="grid grid-cols-2 gap-4">
            {features.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="bg-slate-50 border border-slate-300 rounded-xl p-4">
                <Icon size={20} className="text-orange-400 mb-2" />
                <p className="text-sm font-semibold text-white">{label}</p>
                <p className="text-xs text-slate-500 mt-1">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400" /> System Online</span>
          <span>Gemini 1.5 Flash</span>
          <span>4 Active Agents</span>
        </div>
      </div>

      {/* Right — Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center bg-gradient-to-br from-orange-500 to-pink-600 shadow-lg shadow-orange-600/30">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                <path d="M20 7H4C2.9 7 2 7.9 2 9v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2z" fill="white" fillOpacity="0.9"/>
                <path d="M16 7V5c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="text-lg font-bold text-white">Vendor Portal</p>
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">Welcome back</h2>
          <p className="text-slate-500 mb-8">Sign in to manage your shipments</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full bg-slate-100 border border-slate-300 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-orange-500 transition-colors" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full bg-slate-100 border border-slate-300 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-orange-500 transition-colors" />
            </div>

            {error && <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-sm text-red-300">{error}</div>}

            <button type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-400 hover:to-pink-500 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in...</> : "Sign In"}
            </button>
          </form>

          <div className="mt-6 p-4 bg-slate-50 border border-slate-300 rounded-xl">
            <p className="text-xs text-slate-500 mb-2 font-medium">Demo credentials</p>
            <p className="text-xs font-mono text-slate-700">vendor@fastship.com / Vendor1234</p>
          </div>

          <p className="text-center text-xs text-slate-500 mt-4">
            Admin portal? <a href="/login" className="text-orange-400 hover:text-orange-300">Sign in here</a>
          </p>
        </div>
      </div>
    </div>
  );
}
