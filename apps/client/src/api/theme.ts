import api from './axiosInstance';

export type ThemeSettings = {
  storeName: string;
  logoUrl: string | null;
  darkMode: boolean;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  fontSize: number; // px
  fontWeight: number; // 100–900
  spacingScale: number; // e.g., 1 = 8px grid
  borderRadius: number; // px
  maxWidth: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  homepageLayout: 'hero' | 'grid' | 'list';
  productCardVariant: 'compact' | 'detailed';
  categoryStyle: 'tabs' | 'dropdown';
  showSidebar: boolean;
  stickyHeader: boolean;

  // Optional extras used in the app
  backgroundImageUrl?: string;
  font?: string;
  announcementBar?: {
    text: string;
    backgroundColor: string;
    textColor: string;
    visible: boolean;
  };

  // Server-provided metadata (optional)
  updatedAt?: string;
  createdAt?: string;
  version?: number;
};

export type ThemeSettingsUpdate = Partial<ThemeSettings>;

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  storeName: 'My Store',
  logoUrl: null,
  darkMode: false,
  primaryColor: '#1976d2',
  secondaryColor: '#9c27b0',
  fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif',
  fontSize: 16,
  fontWeight: 400,
  spacingScale: 1,
  borderRadius: 12,
  maxWidth: 'xl',
  homepageLayout: 'grid',
  productCardVariant: 'compact',
  categoryStyle: 'tabs',
  showSidebar: true,
  stickyHeader: true,
};

const THEME_ROUTE = '/theme/settings';

// strip undefined to avoid accidentally nulling fields on PATCH
function pruneUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as Partial<T>;
}

/** GET /theme/settings */
export const getThemeSettings = async (): Promise<ThemeSettings> => {
  const { data } = await api.get<ThemeSettings>(THEME_ROUTE);
  return data;
};

/**
 * PATCH /theme/settings — partial update.
 * Undefined keys are removed from the payload so only changed fields are sent.
 */
export const updateThemeSettings = async (
  settings: ThemeSettingsUpdate,
): Promise<ThemeSettings> => {
  const payload = pruneUndefined(settings);
  const { data } = await api.patch<ThemeSettings>(THEME_ROUTE, payload);
  return data;
};

/** PUT /theme/settings — replace all settings */
export const replaceThemeSettings = async (
  settings: ThemeSettings,
): Promise<ThemeSettings> => {
  const { data } = await api.put<ThemeSettings>(THEME_ROUTE, settings);
  return data;
};

/** POST /theme/settings/reset → returns defaults from the server */
export const resetThemeSettings = async (): Promise<ThemeSettings> => {
  const { data } = await api.post<ThemeSettings>(`${THEME_ROUTE}/reset`);
  return data;
};

/** Convenience: update a single key */
export const setThemeSetting = async <K extends keyof ThemeSettings>(
  key: K,
  value: ThemeSettings[K],
): Promise<ThemeSettings> => {
  return updateThemeSettings({ [key]: value } as ThemeSettingsUpdate);
};
