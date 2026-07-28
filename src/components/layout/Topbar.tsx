;
import { Button } from "../ui/button";
import { useUiStore } from "@/store/uiStore";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/database";
import { TimeTrackerWidget } from "@/components/shared/TimeTrackerWidget";
import { SyncIndicator } from "@/components/shared/SyncIndicator";
import { SimpleTooltip } from "@/components/ui/simple-tooltip";
import { useTranslation } from "@/hooks/useTranslation";
import { Icon } from "@/components/ui/icon";

export function Topbar() {
  const { toggleSidebar, sidebarOpen } = useUiStore();
  const profile = useLiveQuery(() => db.profile.get("default"));
  const { t } = useTranslation();

  return (
    <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 md:px-8 flex items-center justify-between sticky top-0 z-40 transition-all duration-200">
      <div className="flex items-center gap-4">
        {/* Mobile toggle */}
        <SimpleTooltip content={t('sidebar.openNav')}>
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden" 
            onClick={toggleSidebar}
            aria-label={t('sidebar.openNav')}
            aria-expanded={sidebarOpen}
          >
            <Icon name="menu" className="size-5" aria-hidden="true" />
          </Button>
        </SimpleTooltip>

        <h2 className="font-bold text-lg hidden sm:block text-text dark:text-white tracking-tight">{t('topbar.dashboard')}</h2>
      </div>
      <div className="flex items-center gap-4">
        <SyncIndicator />
        <TimeTrackerWidget />
        <div className="flex items-center gap-3 pl-4 border-l border-gray-100 dark:border-gray-700">
          <div className="flex flex-col items-end hidden sm:flex">
             <span className="text-sm font-bold text-text dark:text-white">{profile?.name || "Guru"}</span>
             <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">{profile?.role || "Pengajar"}</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-300 border border-gray-200 dark:border-gray-600 shrink-0 shadow-sm overflow-hidden">
            <Icon name="account_circle" className="size-6 icon-filled" />
          </div>
        </div>
      </div>
    </header>
  );
}
