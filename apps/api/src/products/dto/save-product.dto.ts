// src/products/dto/save-product.dto.ts
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SaveProductDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stock!: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  categoryId!: string;

  // ✅ IMPORTANT: decorate so whitelist won't strip it
  @ApiPropertyOptional({
    type: [String],
    description: 'Ordered list of HTTPS image URLs',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  // Accept omitted or a string; do NOT enforce IsString because client may omit it
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  imageUrl?: string | null;
}
