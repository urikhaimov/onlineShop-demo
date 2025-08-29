import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MetadataDto } from './metadata.dto';

export class CreateProductDto {
  @IsString() name!: string;
  @IsString() description!: string;
  @IsNumber() price!: number;
  @IsNumber() stock!: number;
  @IsString() categoryId!: string;

  @IsArray()
  @IsOptional()
  images?: string[];

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ValidateNested()
  @Type(() => MetadataDto)
  @IsOptional()
  metadata?: MetadataDto; // ✅ allow metadata on create
}
