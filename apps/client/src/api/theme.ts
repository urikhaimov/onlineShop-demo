import api from './axiosInstance';

export type ThemeSettings = {
  darkMode: boolean;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  maxWidth: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  storeName?: string;
  font?: string;
  fontSize?: number;
  fontWeight?: number;
    borderRadius: number;
  spacingScale: number;
  logoUrl?: string;
  homepageLayout?: 'hero' | 'grid' | 'list';
  productCardVariant?: 'compact' | 'detailed';
  categoryStyle?: 'tabs' | 'dropdown';
  showSidebar?: boolean;
  stickyHeader?: boolean;
  // optionally add footerLinks, announcementBar, etc.
};

export const updateThemeSettings = async (
  settings: Partial<ThemeSettings>,
): Promise<ThemeSettings> => {
  const { data } = await api.post<ThemeSettings>('/theme/settings', settings);
  return data;
};
