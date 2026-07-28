import { beforeEach, describe, expect, it } from 'vitest';

import { useUiStore } from '@/store/uiStore';

describe('uiStore notification privacy', () => {
  beforeEach(() => {
    useUiStore.setState({
      language: 'id',
      showNotificationDetails: false,
    });
  });

  it('keeps detailed notification previews disabled by default', () => {
    expect(useUiStore.getState().showNotificationDetails).toBe(false);
  });

  it('requires an explicit state change before showing notification details', () => {
    useUiStore.getState().setShowNotificationDetails(true);
    expect(useUiStore.getState().showNotificationDetails).toBe(true);
  });
});
