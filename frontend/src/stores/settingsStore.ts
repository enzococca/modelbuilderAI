import { create } from 'zustand';

type ViewMode = 'chat' | 'builder' | 'orchestrator' | 'analytics' | 'tutorial' | 'settings';

interface SettingsState {
  theme: 'dark' | 'light';
  viewMode: ViewMode;
  sidebarOpen: boolean;
  rightPanelOpen: boolean;
  setTheme: (theme: 'dark' | 'light') => void;
  setViewMode: (mode: ViewMode) => void;
  toggleSidebar: () => void;
  toggleRightPanel: () => void;
  setSidebarOpen: (open: boolean) => void;
  setRightPanelOpen: (open: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: 'dark',
  viewMode: 'chat',
  sidebarOpen: true,
  rightPanelOpen: false,
  setTheme: (theme) => set({ theme }),
  setViewMode: (viewMode) => set({ viewMode }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setRightPanelOpen: (rightPanelOpen) => set({ rightPanelOpen }),
}));
