import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ContentZoomScope = 'presentation' | 'reader' | 'quiz';

export const CONTENT_ZOOM_MIN = 0.6;
export const CONTENT_ZOOM_MAX = 2.0;
export const CONTENT_ZOOM_STEP = 0.1;
export const CONTENT_ZOOM_DEFAULT = 1;

export const DEFAULT_CONTENT_ZOOM: Record<ContentZoomScope, number> = {
  presentation: CONTENT_ZOOM_DEFAULT,
  reader: CONTENT_ZOOM_DEFAULT,
  quiz: CONTENT_ZOOM_DEFAULT,
};

export function clampContentZoom(value: number): number {
  if (!Number.isFinite(value)) return CONTENT_ZOOM_DEFAULT;
  const clamped = Math.min(CONTENT_ZOOM_MAX, Math.max(CONTENT_ZOOM_MIN, value));
  return Math.round(clamped * 100) / 100;
}

interface UiState {
  sidebarOpen: boolean; // Mobile toggle
  setSidebarOpen: (isOpen: boolean) => void;
  toggleSidebar: () => void;
  
  sidebarCollapsed: boolean; // Desktop collapse
  setSidebarCollapsed: (isCollapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;

  language: 'id' | 'en';
  setLanguage: (lang: 'id' | 'en') => void;

  showNotificationDetails: boolean;
  setShowNotificationDetails: (showDetails: boolean) => void;

  contentZoom: Record<ContentZoomScope, number>;
  setContentZoom: (scope: ContentZoomScope, zoom: number) => void;
  adjustContentZoom: (scope: ContentZoomScope, delta: number) => void;
  resetContentZoom: (scope: ContentZoomScope) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarOpen: false,
      setSidebarOpen: (isOpen) => set({ sidebarOpen: isOpen }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      sidebarCollapsed: false,
      setSidebarCollapsed: (isCollapsed) => set({ sidebarCollapsed: isCollapsed }),
      toggleSidebarCollapsed: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      language: 'id',
      setLanguage: (lang) => set({ language: lang }),

      // Privacy-safe default: lock-screen previews must not disclose schedule
      // details unless the user explicitly opts in.
      showNotificationDetails: false,
      setShowNotificationDetails: (showDetails) => set({ showNotificationDetails: showDetails }),

      contentZoom: { ...DEFAULT_CONTENT_ZOOM },
      setContentZoom: (scope, zoom) =>
        set((state) => ({
          contentZoom: {
            ...DEFAULT_CONTENT_ZOOM,
            ...state.contentZoom,
            [scope]: clampContentZoom(zoom),
          },
        })),
      adjustContentZoom: (scope, delta) =>
        set((state) => {
          const current = state.contentZoom?.[scope] ?? CONTENT_ZOOM_DEFAULT;
          return {
            contentZoom: {
              ...DEFAULT_CONTENT_ZOOM,
              ...state.contentZoom,
              [scope]: clampContentZoom(current + delta),
            },
          };
        }),
      resetContentZoom: (scope) =>
        set((state) => ({
          contentZoom: {
            ...DEFAULT_CONTENT_ZOOM,
            ...state.contentZoom,
            [scope]: CONTENT_ZOOM_DEFAULT,
          },
        })),
    }),
    {
      name: 'eduplanner-ui-store',
      partialize: (state) => ({
        language: state.language,
        showNotificationDetails: state.showNotificationDetails,
        contentZoom: state.contentZoom,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<UiState> | undefined;
        const persistedZoom = persisted?.contentZoom;
        return {
          ...currentState,
          ...persisted,
          contentZoom: {
            presentation: clampContentZoom(persistedZoom?.presentation ?? CONTENT_ZOOM_DEFAULT),
            reader: clampContentZoom(persistedZoom?.reader ?? CONTENT_ZOOM_DEFAULT),
            quiz: clampContentZoom(persistedZoom?.quiz ?? CONTENT_ZOOM_DEFAULT),
          },
        };
      },
    }
  )
);
