import {
  CATEGORY_STYLES,
  CategoryStyle,
  HOMEPAGE_LAYOUTS,
  PRODUCT_CARD_VARIANTS,
  ProductCardVariant,
} from '@common/types';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateThemeSettingsDto {
  @IsOptional()
  @IsString()
  primaryColor?: string;

  @IsOptional()
  @IsString()
  secondaryColor?: string;

  @IsOptional()
  @IsBoolean()
  darkMode?: boolean;

  @IsOptional()
  @IsString()
  fontFamily?: string;

  @IsOptional()
  @IsNumber()
  borderRadius: number;

  @IsOptional()
  @IsNumber()
  spacingScale: number;

  @IsOptional()
  @IsString()
  maxWidth?: string;

  @IsOptional()
  @IsString()
  storeName?: string;

  @IsOptional()
  @IsString()
  font?: string;

  @IsOptional()
  @IsNumber()
  fontSize?: number;

  @IsOptional()
  @IsNumber()
  fontWeight?: number;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsIn(Object.values(HOMEPAGE_LAYOUTS))
  homepageLayout?: string;

  @IsOptional()
  @IsEnum(PRODUCT_CARD_VARIANTS)
  productCardVariant?: ProductCardVariant;

  @IsOptional()
  @IsIn(Object.values(CATEGORY_STYLES))
  categoryStyle?: CategoryStyle;

  @IsOptional()
  @IsBoolean()
  showSidebar?: boolean;

  @IsOptional()
  @IsBoolean()
  stickyHeader?: boolean;
}
