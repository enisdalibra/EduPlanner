import { useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { PwaUpdateBanner } from '@/components/pwa/PwaUpdateBanner';

export function PwaUpdatePrompt() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateFailed, setUpdateFailed] = useState(false);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      console.error('Service worker registration failed:', error);
    },
  });

  if (!needRefresh) return null;

  const dismissUpdate = () => {
    setUpdateFailed(false);
    setNeedRefresh(false);
  };

  const applyUpdate = async () => {
    setIsUpdating(true);
    setUpdateFailed(false);

    try {
      await updateServiceWorker(true);
    } catch (error) {
      console.error('Service worker update failed:', error);
      setIsUpdating(false);
      setUpdateFailed(true);
    }
  };

  return (
    <PwaUpdateBanner
      isUpdating={isUpdating}
      updateFailed={updateFailed}
      onDismiss={dismissUpdate}
      onUpdate={applyUpdate}
    />
  );
}
