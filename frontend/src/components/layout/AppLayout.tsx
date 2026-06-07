import type { ReactNode } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";

interface AppLayoutProps {
  children: ReactNode;
}

/**
 * Responsive application shell.
 *
 * - Mobile (<1024px): Header (top) + scrollable content + BottomNav (fixed bottom)
 * - Desktop (≥1024px): Header (top) + Sidebar (left 256px) + content (pushed right)
 */
export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      {/* ─── Top Header (always visible) ─── */}
      <Header />

      <div className="flex flex-1">
        {/* ─── Desktop Sidebar (hidden on mobile) ─── */}
        <Sidebar />

        {/* ─── Main Content Area ─── */}
        <main
          className="
            flex-1 w-full
            px-container-mobile lg:px-container-desktop
            py-6 lg:py-8
            lg:ml-64
            min-h-0
          "
        >
          <div className="max-w-5xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* ─── Mobile Bottom Nav (hidden on desktop) ─── */}
      <BottomNav />
    </div>
  );
}
