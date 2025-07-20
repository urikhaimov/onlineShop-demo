import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsIn,
  Min,
  Max,
} from 'class-validator';

export class ThemeSettingsDto {
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
  @Min(0)
  @Max(64)
  borderRadius?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(64)
  spacingScale?: number;

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
  @IsString()
  homepageLayout?: string;

  @IsOptional()
  @IsString()
  productCardVariant?: string;

  @IsOptional()
  @IsString()
  categoryStyle?: string;

  @IsOptional()
  @IsBoolean()
  showSidebar?: boolean;

  @IsOptional()
  @IsBoolean()
  stickyHeader?: boolean;
}
