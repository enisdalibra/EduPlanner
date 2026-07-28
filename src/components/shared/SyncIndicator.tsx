;
import { useSyncStore } from "@/store/syncStore";
import { SimpleTooltip } from "@/components/ui/simple-tooltip";
import { formatDistanceToNow } from "date-fns";
import { Icon } from "@/components/ui/icon";

export function SyncIndicator() {
  const { autoSyncEnabled, isSyncing, lastSynced, provider } = useSyncStore();

  if (provider === 'disconnected') {
    return (
      <SimpleTooltip content="Backup provider disconnected">
        <div className="flex items-center justify-center w-8 h-8 rounded-full text-slate-400 hover:bg-slate-100 transition-colors">
          <Icon name="cloud_off" className="w-4 h-4" />
        </div>
      </SimpleTooltip>
    );
  }

  if (!autoSyncEnabled) {
    return (
      <SimpleTooltip content="Local mock auto-backup is disabled">
        <div className="flex items-center justify-center w-8 h-8 rounded-full text-slate-400 hover:bg-slate-100 transition-colors">
          <Icon name="science" className="w-4 h-4" />
        </div>
      </SimpleTooltip>
    );
  }

  return (
    <SimpleTooltip 
      content={
        isSyncing 
          ? "Creating local mock backup..."
          : lastSynced
            ? `Last local mock backup: ${formatDistanceToNow(lastSynced, { addSuffix: true })}`
            : "Waiting for local mock backup..."
      }
    >
      <div className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${isSyncing ? 'text-blue-500 bg-blue-50' : 'text-emerald-500 hover:bg-slate-100'}`}>
        {isSyncing ? (
          <Icon name="progress_activity" className="w-4 h-4 animate-spin" />
        ) : (
          <Icon name="science" className="w-4 h-4" />
        )}
      </div>
    </SimpleTooltip>
  );
}
