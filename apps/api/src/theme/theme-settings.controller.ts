import {
  Body,
  Controller,
  Get,
  Inject,
  Put,
  Patch,
  Post,
} from '@nestjs/common';
import { Firestore } from '@google-cloud/firestore';
import { UpdateThemeSettingsDto } from './dto/update-theme-settings.dto';
import { ProductCardVariant } from '@common/types';

export interface ThemeSettings {
  primaryColor?: string;
  secondaryColor?: string;
  darkMode?: boolean;
  fontFamily?: string;
  borderRadius: number;
  spacingScale: number;
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
  fontFamily: 'Arial',
  borderRadius: 2,
  spacingScale: 1,
};

@Controller('theme/settings')
export class ThemeSettingsController {
  constructor(@Inject(Firestore) private readonly db: Firestore) {}

  private docRef() {
    return this.db.collection('settings').doc('theme');
  }

  @Get()
  async getThemeSettings(): Promise<ThemeSettings> {
    const snap = await this.docRef().get();
    if (!snap.exists) return { ...defaultThemeSettings };
    return { ...defaultThemeSettings, ...(snap.data() as ThemeSettings) };
  }

  @Put()
  async putThemeSettings(
    @Body() dto: UpdateThemeSettingsDto,
  ): Promise<ThemeSettings> {
    const current = await this.getThemeSettings();
    const updated = { ...current, ...dto };
    await this.docRef().set(updated);
    return updated;
  }

  @Patch()
  async patchThemeSettings(
    @Body() dto: UpdateThemeSettingsDto,
  ): Promise<ThemeSettings> {
    await this.docRef().set(dto, { merge: true });
    return this.getThemeSettings();
  }

  @Post('reset')
  async resetThemeSettings(): Promise<ThemeSettings> {
    await this.docRef().set(defaultThemeSettings);
    return { ...defaultThemeSettings };
  }
}
