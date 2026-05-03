"use client";
import { useEffect, useState, type ReactNode } from "react";

/**
 * Wrapper that only renders children after the component has mounted on the client.
 * This prevents MUI X Charts and other browser-dependent components from crashing
 * during Vercel's SSR/prerendering phase.
 */
export default function ClientOnly({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <>{fallback || <div className="h-60 flex items-center justify-center text-slate-400 text-sm">Loading chart...</div>}</>
    );
  }

  return <>{children}</>;
}
