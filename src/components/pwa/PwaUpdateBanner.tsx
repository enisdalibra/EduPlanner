import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useTranslation } from '@/hooks/useTranslation';

interface PwaUpdateBannerProps {
  isUpdating: boolean;
  updateFailed: boolean;
  onDismiss: () => void;
  onUpdate: () => void;
}

export function PwaUpdateBanner({
  isUpdating,
  updateFailed,
  onDismiss,
  onUpdate,
}: PwaUpdateBannerProps) {
  const { t } = useTranslation();

  return (
    <aside
      aria-labelledby="pwa-update-title"
      aria-live="polite"
      className="fixed inset-x-4 bottom-4 z-[100] ml-auto max-w-lg rounded-2xl border border-border bg-background p-4 text-foreground shadow-2xl dark:bg-gray-900 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
        >
          <Icon name="system_update" className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="pwa-update-title" className="font-semibold">
            {t('pwaUpdate.title')}
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {t('pwaUpdate.description')}
          </p>
          {updateFailed && (
            <p role="alert" className="mt-2 text-sm text-danger">
              {t('pwaUpdate.error')}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isUpdating}
          onClick={onDismiss}
        >
          {t('pwaUpdate.later')}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={isUpdating}
          onClick={onUpdate}
        >
          {isUpdating ? t('pwaUpdate.updating') : t('pwaUpdate.updateNow')}
        </Button>
      </div>
    </aside>
  );
}
