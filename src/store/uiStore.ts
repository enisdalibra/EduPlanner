import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
    }),
    {
      name: 'eduplanner-ui-store',
      partialize: (state) => ({
        language: state.language,
        showNotificationDetails: state.showNotificationDetails,
      }),
    }
  )
);
