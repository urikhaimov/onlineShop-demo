import api from './axiosInstance';

export type ThemeSettings = {
  storeName: string;
  logoUrl: string | null;
  darkMode: boolean;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  spacingScale: number;
  borderRadius: number;
  maxWidth: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  homepageLayout: 'hero' | 'grid' | 'list';
  productCardVariant: 'compact' | 'detailed';
  categoryStyle: 'tabs' | 'dropdown';
  showSidebar: boolean;
  stickyHeader: boolean;

  // ✅ Add these if they're used in the app:
  backgroundImageUrl?: string;
  font?: string;
  announcementBar?: {
    text: string;
    backgroundColor: string;
    textColor: string;
    visible: boolean;
  };
};



export const updateThemeSettings = async (
  settings: Partial<ThemeSettings>,
): Promise<ThemeSettings> => {
  const { data } = await api.post<ThemeSettings>('/theme/settings', settings);
  return data;
};
