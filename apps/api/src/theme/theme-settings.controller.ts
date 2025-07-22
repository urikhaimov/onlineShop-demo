import { Body, Controller, Get, Post } from '@nestjs/common';
import { UpdateThemeSettingsDto } from './dto/update-theme-settings.dto';
import { ProductCardVariant } from '@common/types';

export interface ThemeSettings {
  primaryColor?: string;
  secondaryColor?: string;
  darkMode?: boolean;
  fontFamily?: string;
  borderRadius: number;
  spacingScale: number;

  // Optional extended settings
  maxWidth?: string;
  storeName?: string;
  font?: string;
  fontSize?: number;
  fontWeight?: number;
  logoUrl?: string;
  homepageLayout?: string;
  productCardVariant?: ProductCardVariant;
  categoryStyle?: string;
  showSidebar?: boolean;
  stickyHeader?: boolean;
}

const defaultThemeSettings: ThemeSettings = {
  primaryColor: '#1976d2',
  secondaryColor: '#dc004e',
  darkMode: false,
  fontFamily: 'Roboto',
  borderRadius: 8,
  spacingScale: 8,
};

@Controller('theme/settings')
export class ThemeSettingsController {
  private currentSettings: ThemeSettings = { ...defaultThemeSettings };

  @Get()
  getThemeSettings(): ThemeSettings {
    return this.currentSettings;
  }

  @Post()
  updateThemeSettings(
    @Body() updatedSettings: UpdateThemeSettingsDto,
  ): ThemeSettings {
    this.currentSettings = { ...this.currentSettings, ...updatedSettings };
    return this.currentSettings;
  }
}
