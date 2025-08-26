// src/theme/dto/update-theme-settings.dto.ts
import {
  CATEGORY_STYLES,
  CategoryStyle,
  HOMEPAGE_LAYOUTS,
  PRODUCT_CARD_VARIANTS,
  ProductCardVariant,
} from '@common/types';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsHexColor,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateThemeSettingsDto {
  @IsOptional()
  @IsHexColor()
  primaryColor?: string; // e.g. #1976d2

  @IsOptional()
  @IsHexColor()
  secondaryColor?: string; // e.g. #ff4081

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  darkMode?: boolean;

  @IsOptional()
  @IsString()
  fontFamily?: string;

  // ---- numbers ----
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  borderRadius?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  spacingScale?: number;

  // ---- optional extended settings ----
  @IsOptional()
  @IsIn(['xs', 'sm', 'md', 'lg', 'xl', 'xxl'])
  maxWidth?: string;

  @IsOptional()
  @IsString()
  storeName?: string;

  @IsOptional()
  @IsString()
  font?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  fontSize?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  fontWeight?: number;

  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @IsOptional()
  @IsIn(Object.values(HOMEPAGE_LAYOUTS))
  @IsString()
  homepageLayout?: string;

  @IsOptional()
  @IsIn(Object.values(PRODUCT_CARD_VARIANTS))
  productCardVariant?: ProductCardVariant;

  @IsOptional()
  @IsIn(Object.values(CATEGORY_STYLES))
  categoryStyle?: CategoryStyle;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  showSidebar?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  stickyHeader?: boolean;
}
