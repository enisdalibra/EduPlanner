import { useState } from "react";
import type React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { format } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUiStore } from "@/store/uiStore";
import { useTranslation } from "@/hooks/useTranslation";
import { useTheme } from "@/hooks/useTheme";
import { useSyncStore } from "@/store/syncStore";
import { SyncService } from "@/services/SyncService";
import { BackupService, type BackupInspection } from "@/services/BackupService";
import {
  RestoreRecoveryWorkflow,
  type PreparedRestore,
} from "@/services/RestoreRecoveryWorkflow";
import { Icon } from "@/components/ui/icon";
import { RestorePreviewDialog } from "./components/RestorePreviewDialog";

interface PendingRestore {
  payload: string;
  inspection: BackupInspection;
  origin: "file" | "mock";
}

function downloadJson(payload: string, fileName: string): void {
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function SettingsView() {
  const [isImporting, setIsImporting] = useState(false);
  const [isRestoringMock, setIsRestoringMock] = useState(false);
  const [isRestoreWorking, setIsRestoreWorking] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<PendingRestore | null>(null);
  const [preparedRestore, setPreparedRestore] = useState<PreparedRestore | null>(null);
  const {
    language,
    setLanguage,
    showNotificationDetails,
    setShowNotificationDetails,
  } = useUiStore();
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const {
    autoSyncEnabled,
    isSyncing,
    setAutoSync,
    provider,
    setProvider,
    setIsSyncing,
    setLastSynced,
  } = useSyncStore();
  const providerStatus = SyncService.getProviderStatus(provider);

  const handleManualSync = async () => {
    try {
      setIsSyncing(true);
      const result = await SyncService.uploadBackup(provider);
      setLastSynced(result.uploadedAt);
      toast.success(t('settings.mockBackupSuccess'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('settings.mockBackupError'));
    } finally {
      setIsSyncing(false);
    }
  };

  const openRestorePreview = (payload: string, origin: PendingRestore["origin"]) => {
    const inspection = BackupService.inspectExportPayload(payload);
    setPreparedRestore(null);
    setPendingRestore({ payload, inspection, origin });
  };

  const closeRestorePreview = () => {
    if (isRestoreWorking) return;
    setPendingRestore(null);
    setPreparedRestore(null);
  };

  const handlePrepareRecovery = async () => {
    if (!pendingRestore) return;
    setIsRestoreWorking(true);
    try {
      const prepared = await RestoreRecoveryWorkflow.prepare(
        pendingRestore.payload,
        (snapshot) => downloadJson(snapshot.payload, snapshot.fileName),
      );
      setPreparedRestore(prepared);
      toast.info(t('settings.recoveryDownloaded'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('settings.errorExport'));
    } finally {
      setIsRestoreWorking(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!pendingRestore || !preparedRestore) return;
    setIsRestoreWorking(true);
    try {
      await RestoreRecoveryWorkflow.complete(preparedRestore);
      toast.success(pendingRestore.origin === 'mock'
        ? t('settings.mockRestoreSuccess')
        : t('settings.successImport'));
      setPendingRestore(null);
      setPreparedRestore(null);
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      toast.error(error instanceof Error
        ? error.message
        : pendingRestore.origin === 'mock'
          ? t('settings.mockRestoreError')
          : t('settings.errorImport'));
    } finally {
      setIsRestoreWorking(false);
    }
  };

  const handleMockRestore = async () => {
    setIsRestoringMock(true);
    try {
      const result = await SyncService.restoreFromProvider(provider);
      if (result.status === 'unavailable') {
        toast.error(result.reason);
        return;
      }
      if (result.status === 'empty') {
        toast.info(t('settings.mockRestoreEmpty'));
        return;
      }
      openRestorePreview(result.payload, 'mock');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('settings.mockRestoreError'));
    } finally {
      setIsRestoringMock(false);
    }
  };

  const handleExport = async () => {
    try {
      const jsonString = await BackupService.generateExportPayload(2);
      downloadJson(jsonString, `eduplanner_backup_${format(new Date(), 'yyyyMMdd_HHmm')}.json`);
      toast.success(t('settings.successExport'));
    } catch (e) {
      toast.error(t('settings.errorExport'));
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const payload = await BackupService.readExportFile(file);
      openRestorePreview(payload, 'file');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('settings.errorImport'));
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-8 max-w-4xl view-enter pb-10">
      <div>
        <h1 className="page-title text-3xl">{t('settings.title')}</h1>
        <p className="page-description mt-2">{t('settings.desc')}</p>
      </div>

      <div className="panel-lg space-y-6">
        <h2 className="text-lg font-bold tracking-tight text-text dark:text-white flex items-center gap-2">
          <Icon name="palette" className="text-primary" />
          {t('settings.groupAppearance')}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
              <Icon name="translate" className="w-4 h-4" />
              {t('settings.prefLang')}
            </label>
            <Select value={language} onValueChange={(val: 'id'|'en') => setLanguage(val)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih bahasa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="id">Bahasa Indonesia</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
              <Icon name="desktop_windows" className="w-4 h-4" />
              {t('settings.prefTheme')}
            </label>
            <Select value={theme} onValueChange={(val: any) => setTheme(val)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih tema" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">{t('settings.themeLight')}</SelectItem>
                <SelectItem value="dark">{t('settings.themeDark')}</SelectItem>
                <SelectItem value="system">{t('settings.themeSystem')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-gray-50/60 p-4 dark:border-gray-700 dark:bg-gray-800/60 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-bold text-text dark:text-white">
              <Icon name="notifications_off" className="h-5 w-5 text-primary" />
              {t('settings.notificationPrivacyLabel')}
            </div>
            <p className="max-w-2xl text-sm text-gray-500 dark:text-gray-400">
              {t('settings.notificationPrivacyDescription')}
            </p>
          </div>
          <Button
            type="button"
            variant={showNotificationDetails ? "outline" : "default"}
            aria-pressed={showNotificationDetails}
            onClick={() => setShowNotificationDetails(!showNotificationDetails)}
            className="shrink-0"
          >
            {showNotificationDetails
              ? t('settings.notificationDetailsShown')
              : t('settings.notificationDetailsHidden')}
          </Button>
        </div>
      </div>

      <div className="panel-lg space-y-6">
        <h2 className="text-lg font-bold tracking-tight text-text dark:text-white flex items-center gap-2">
          <Icon name="sync_saved_locally" className="text-primary" />
          {t('settings.syncTitle')}
        </h2>
        <Alert
          variant="default"
          className={providerStatus.state === 'mock'
            ? "bg-warning/10 border-warning/20 rounded-2xl"
            : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-2xl"}
        >
          <Icon
            name={providerStatus.state === 'mock' ? "science" : "cloud_off"}
            className={providerStatus.state === 'mock' ? "h-5 w-5 text-warning" : "h-5 w-5 text-gray-500"}
          />
          <AlertTitle className="font-bold">
            {providerStatus.state === 'mock'
              ? t('settings.mockStatusTitle')
              : t('settings.disconnectedStatusTitle')}
          </AlertTitle>
          <AlertDescription>
            {providerStatus.state === 'mock'
              ? t('settings.mockStatusDesc')
              : t('settings.disconnectedStatusDesc')}
          </AlertDescription>
        </Alert>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold uppercase tracking-wider text-gray-400">
                {t('settings.providerLabel')}
              </label>
              <Select
                value={provider}
                onValueChange={(value) => {
                  if (value === 'mock' || value === 'disconnected') setProvider(value);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('settings.providerLabel')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="disconnected">{t('settings.providerDisconnected')}</SelectItem>
                  <SelectItem value="mock">{t('settings.providerMock')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {provider === 'mock' && (
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                <span className="text-sm font-semibold text-text dark:text-gray-300">
                  {t('settings.mockAutoBackup')}
                </span>
                <Button 
                  variant={autoSyncEnabled ? "success" : "ghost"} 
                  size="sm"
                  onClick={() => setAutoSync(!autoSyncEnabled)}
                >
                  {autoSyncEnabled ? t('settings.statusActive') : t('settings.statusDisabled')}
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-end gap-3">
            {provider === 'mock' && (
              <>
                <Button
                  size="lg"
                  variant="default"
                  className="flex-1 shadow-lg shadow-primary/20"
                  onClick={handleManualSync}
                  disabled={isSyncing || isRestoringMock}
                >
                  <Icon name="sync" className="w-5 h-5 mr-2" />
                  {isSyncing ? t('settings.mockBackingUp') : t('settings.mockBackupNow')}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="flex-1"
                  onClick={handleMockRestore}
                  disabled={isSyncing || isRestoringMock}
                >
                  <Icon name="restore" className="w-5 h-5 mr-2" />
                  {isRestoringMock ? t('settings.mockRestoring') : t('settings.mockRestore')}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="panel-lg space-y-6">
        <h2 className="text-lg font-bold tracking-tight text-text dark:text-white flex items-center gap-2">
          <Icon name="settings_backup_restore" className="text-primary" />
          {t('settings.groupBackup')}
        </h2>

        <Alert variant="default" className="bg-warning/10 border-warning/20 rounded-2xl">
          <Icon name="warning" className="h-5 w-5 text-warning" />
          <AlertTitle className="font-bold text-warning">{t('settings.importantTitle')}</AlertTitle>
          <AlertDescription className="text-warning/80">
            {t('settings.importantDesc')}
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-none shadow-none bg-gray-50/50 dark:bg-gray-800/50">
            <CardHeader>
              <CardTitle className="text-base font-bold">{t('settings.exportTitle')}</CardTitle>
              <CardDescription>{t('settings.exportDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('settings.exportText')}
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="default" className="w-full shadow-lg shadow-primary/20" onClick={handleExport}>
                <Icon name="download" className="w-5 h-5 mr-2" />
                {t('settings.btnExport')}
              </Button>
            </CardFooter>
          </Card>

          <Card className="border-none shadow-none bg-danger/5 dark:bg-danger/10">
            <CardHeader>
              <CardTitle className="text-base font-bold text-danger">{t('settings.importTitle')}</CardTitle>
              <CardDescription>{t('settings.importDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-danger/70 dark:text-danger/60 font-medium">
                {t('settings.importText')}
              </p>
            </CardContent>
            <CardFooter>
              <div className="relative w-full">
                <input 
                  type="file" 
                  accept=".json" 
                  onChange={handleImport}
                  disabled={isImporting}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  title="Pilih file backup json"
                />
                <Button variant="destructive" className="w-full shadow-lg shadow-danger/20" disabled={isImporting}>
                  <Icon name="upload" className="w-5 h-5 mr-2" />
                  {isImporting ? t('settings.btnImporting') : t('settings.btnImport')}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>

      <RestorePreviewDialog
        open={pendingRestore !== null}
        inspection={pendingRestore?.inspection ?? null}
        recoverySnapshot={preparedRestore?.recoverySnapshot ?? null}
        isWorking={isRestoreWorking}
        onCancel={closeRestorePreview}
        onPrepareRecovery={handlePrepareRecovery}
        onRestore={handleConfirmRestore}
      />
    </div>
  );
}
