/**
 * Zustand global store — tracks auth, active shipment, agent state
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

interface AppState {
  // Auth
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;

  // Active shipment the agent is "thinking about"
  activeShipmentId: string | null;
  setActiveShipment: (id: string | null) => void;

  // Agent status
  agentThinking: boolean;
  agentCurrentStep: string;
  setAgentThinking: (thinking: boolean, step?: string) => void;

  // Sidebar
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  // Pending escalations count (badge)
  pendingEscalations: number;
  setPendingEscalations: (count: number) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => {
        localStorage.setItem("access_token", token);
        set({ user, token });
      },
      logout: () => {
        localStorage.removeItem("access_token");
        set({ user: null, token: null });
      },

      activeShipmentId: null,
      setActiveShipment: (id) => set({ activeShipmentId: id }),

      agentThinking: false,
      agentCurrentStep: "",
      setAgentThinking: (thinking, step = "") =>
        set({ agentThinking: thinking, agentCurrentStep: step }),

      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      pendingEscalations: 0,
      setPendingEscalations: (count) => set({ pendingEscalations: count }),
    }),
    { name: "agentic-shipping-store", partialize: (s) => ({ user: s.user, token: s.token }) }
  )
);
