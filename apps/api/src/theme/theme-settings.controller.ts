import { Body, Controller, Get, Put, Patch, Post } from '@nestjs/common';
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

// NOTE: spacingScale should be a multiplier (1 = default). 8 here would blow up spacing.
const defaultThemeSettings: ThemeSettings = {
  primaryColor: '#1976d2',
  secondaryColor: '#dc004e',
  darkMode: false,
  fontFamily: 'Roboto',
  borderRadius: 2,
  spacingScale: 1, // ← important (your frontend multiplies 8 * spacingScale * factor)
};

@Controller('theme/settings')
export class ThemeSettingsController {
  private currentSettings: ThemeSettings = { ...defaultThemeSettings };

  @Get()
  getThemeSettings(): ThemeSettings {
    return this.currentSettings;
  }

  // Full/Idempotent update from client (what your frontend is calling)
  @Put()
  putThemeSettings(@Body() dto: UpdateThemeSettingsDto): ThemeSettings {
    this.currentSettings = { ...this.currentSettings, ...dto };
    return this.currentSettings;
  }

  // Optional: partial update
  @Patch()
  patchThemeSettings(@Body() dto: UpdateThemeSettingsDto): ThemeSettings {
    this.currentSettings = { ...this.currentSettings, ...dto };
    return this.currentSettings;
  }

  // Optional: reset to defaults
  @Post('reset')
  resetThemeSettings(): ThemeSettings {
    this.currentSettings = { ...defaultThemeSettings };
    return this.currentSettings;
  }
}
