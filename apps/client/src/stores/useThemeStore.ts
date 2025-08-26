import { create } from 'zustand';
import axiosInstance from '../api/axiosInstance';
import { ThemeSettings } from '../api/theme';

interface ThemeState {
  themeSettings: ThemeSettings;
  isLoading: boolean;
  error: string | null;

  updateTheme: (newSettings: Partial<ThemeSettings>) => void;
  toggleDarkMode: () => Promise<void>;
  setDarkMode: (dark: boolean) => Promise<void>;
  setTheme: (settings: ThemeSettings) => void;
  loadTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  themeSettings: {
    storeName: 'My Store',
    darkMode: false,
    primaryColor: '#1976d2',
    secondaryColor: '#ff4081',
    fontFamily: 'Roboto',
    fontSize: 16,
    fontWeight: 400,
    logoUrl: '',
    homepageLayout: 'hero',
    productCardVariant: 'compact',
    categoryStyle: 'tabs',
    showSidebar: true,
    maxWidth: 'xl',
    stickyHeader: true,
    spacingScale: 1,
    borderRadius: 8,
  },
  isLoading: true,
  error: null,

  updateTheme: (newSettings) => {
    set((state) => ({
      themeSettings: { ...state.themeSettings, ...newSettings },
    }));
  },

  setTheme: (settings) => {
    set({ themeSettings: settings, isLoading: false, error: null });
  },

  setDarkMode: async (dark) => {
    const prev = get().themeSettings;
    const next = { ...prev, darkMode: dark };
    set({ themeSettings: next }); // optimistic

    try {
      await axiosInstance.put('/theme/settings', next);
    } catch (err) {
      console.error('❌ Failed to update dark mode:', err);
      // Optional revert; DO NOT set global `error` here
      set({ themeSettings: prev });
    }
  },

  toggleDarkMode: async () => {
    const now = get().themeSettings.darkMode;
    await get().setDarkMode(!now);
  },

  loadTheme: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } =
        await axiosInstance.get<ThemeSettings>('/theme/settings');
      get().setTheme(data);
    } catch (error: any) {
      console.error('❌ Failed to load theme:', error);
      set({ error: error?.message || 'Load theme failed', isLoading: false });
    }
  },
}));
