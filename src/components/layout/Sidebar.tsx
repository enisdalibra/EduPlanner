import { NavLink } from "react-router";
;
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/uiStore";
import { SimpleTooltip } from "@/components/ui/simple-tooltip";
import { SHORTCUTS } from "@/hooks/useKeyboardShortcuts";
import { useTranslation } from "@/hooks/useTranslation";
import { Icon } from "@/components/ui/icon";

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen, sidebarCollapsed } = useUiStore();
  const { t } = useTranslation();

  const navItems = [
    { icon: "dashboard", label: t('sidebar.dashboard'), href: "/" },
    { icon: "account_circle", label: t('sidebar.profile'), href: "/profile" },
    { icon: "co_present", label: t('sidebar.classes'), href: "/classes" },
    { icon: "library_books", label: t('sidebar.subjects'), href: "/subjects" },
    { icon: "groups", label: t('sidebar.students'), href: "/students" },
    { icon: "check_box", label: t('sidebar.attendance'), href: "/attendance" },
    { icon: "edit_document", label: t('sidebar.gradebook'), href: "/grades" },
    { icon: "menu_book", label: t('sidebar.materials'), href: "/materials" },
    { icon: "edit_note", label: t('sidebar.journals'), href: "/journals" },
    { icon: "analytics", label: t('sidebar.evaluations'), href: "/evaluations" },
    { icon: "calendar_month", label: t('sidebar.calendar'), href: "/calendar" },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 bg-white dark:bg-gray-800 border-r border-secondary dark:border-gray-700 transform transition-all duration-200 ease-in-out md:translate-x-0 flex flex-col",
        sidebarOpen ? "translate-x-0" : "-translate-x-full",
        sidebarCollapsed ? "w-20" : "w-64"
      )}>
        <div className={cn("h-16 border-b border-gray-100 dark:border-gray-700 flex items-center shrink-0", sidebarCollapsed ? "justify-center px-2" : "px-6 justify-between")}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-bold shrink-0 shadow-lg shadow-primary/30">
              <Icon name="school" className="text-[24px]" />
            </div>
            {!sidebarCollapsed && <span className="font-bold text-xl tracking-tight transition-opacity whitespace-nowrap text-text dark:text-white">EduPlanner</span>}
          </div>
          
          <SimpleTooltip content={sidebarCollapsed ? t('sidebar.expandNav') : t('sidebar.collapseNav')} side="right">
            <button 
              className={cn("hidden md:flex items-center justify-center text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all active:scale-95", sidebarCollapsed ? "absolute -right-3 top-5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 w-6 h-6 shadow-sm z-50" : "w-8 h-8")}
              onClick={useUiStore.getState().toggleSidebarCollapsed}
              aria-label={sidebarCollapsed ? t('sidebar.expandNav') : t('sidebar.collapseNav')}
              aria-expanded={!sidebarCollapsed}
            >
              {sidebarCollapsed ? <Icon name="menu" className="h-3 w-3" aria-hidden="true" /> : <Icon name="menu_open" className="h-5 w-5" aria-hidden="true" />}
            </button>
          </SimpleTooltip>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const sc = SHORTCUTS.find(s => s.path === item.href);
            const tooltipContent = sidebarCollapsed 
              ? (sc ? `${item.label} (${sc.key})` : item.label)
              : (sc ? `${t('sidebar.shortcut')}: ${sc.key}` : "");
              
            return (
              <SimpleTooltip key={item.href} content={tooltipContent} side="right">
                <NavLink
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) => cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors",
                    isActive 
                      ? "nav-item-active" 
                      : "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700",
                    sidebarCollapsed && "justify-center px-0"
                  )}
                >
                  <Icon name={item.icon} className={cn("w-5 h-5 flex-shrink-0")} aria-hidden="true" />
                  <span className={cn(sidebarCollapsed && "sr-only")}>{item.label}</span>
                </NavLink>
              </SimpleTooltip>
            );
          })}
        </nav>
        
        <div className="p-4 mt-auto border-t border-gray-100 dark:border-gray-700 flex flex-col gap-2">
          <SimpleTooltip content={sidebarCollapsed ? `${t('sidebar.settings')} (${SHORTCUTS.find(s => s.path === '/settings')?.key})` : `${t('sidebar.shortcut')}: ${SHORTCUTS.find(s => s.path === '/settings')?.key}`} side="right">
            <NavLink
              to="/settings"
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors",
                isActive 
                  ? "nav-item-active" 
                  : "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700",
                sidebarCollapsed && "justify-center px-0"
              )}
            >
              <Icon name="settings" className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
              <span className={cn(sidebarCollapsed && "sr-only")}>{t('sidebar.settings')}</span>
            </NavLink>
          </SimpleTooltip>

          <SimpleTooltip content={sidebarCollapsed ? `${t('sidebar.about')} (${SHORTCUTS.find(s => s.path === '/about')?.key})` : `${t('sidebar.shortcut')}: ${SHORTCUTS.find(s => s.path === '/about')?.key}`} side="right">
            <NavLink
              to="/about"
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors mb-2",
                isActive 
                  ? "nav-item-active" 
                  : "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700",
                sidebarCollapsed && "justify-center px-0"
              )}
            >
              <Icon name="info" className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
              <span className={cn(sidebarCollapsed && "sr-only")}>{t('sidebar.about')}</span>
            </NavLink>
          </SimpleTooltip>
          
          <SimpleTooltip content={t('sidebar.offlineDesc')} side="right">
            <div className={cn("flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-[10px] uppercase font-bold tracking-widest bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 rounded-xl mt-1", sidebarCollapsed && "justify-center px-0")}>
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shrink-0"></div>
              {!sidebarCollapsed && <span>{t('sidebar.offlineMode')}</span>}
            </div>
          </SimpleTooltip>
        </div>
      </aside>
    </>
  );
}
