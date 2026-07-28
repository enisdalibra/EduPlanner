import { Outlet } from "react-router";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { Toaster } from "@/components/ui/sonner";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useAutoSync } from "@/hooks/useAutoSync";
import { useNotificationScheduler } from "@/hooks/useNotificationScheduler";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useUiStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

export function AppLayout() {
  useKeyboardShortcuts();
  useAutoSync();
  useNotificationScheduler();
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);

  return (
    <TooltipProvider delay={200}>
      <div className="min-h-screen bg-background dark:bg-gray-900 flex text-text dark:text-white">
        <Sidebar />
        
        <div className={cn("flex-1 flex flex-col min-w-0 transition-all duration-200 ease-in-out", sidebarCollapsed ? "md:pl-20" : "md:pl-64")}>
          <Topbar />
          
          <main className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
              <div className="mx-auto max-w-7xl">
                <ErrorBoundary>
                  <div className="view-enter">
                    <Outlet />
                  </div>
                </ErrorBoundary>
              </div>
            </div>
          </main>
        </div>
        <Toaster position="bottom-right" className="toast" />
      </div>
    </TooltipProvider>
  );
}
