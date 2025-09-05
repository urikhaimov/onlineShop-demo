// apps/api/src/products/dto/update-product.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from './create-product.dto';
import { IsArray, IsOptional, IsString, ArrayNotEmpty } from 'class-validator';

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[]; // <-- allow array of URLs

  @IsOptional()
  @IsString()
  imageUrl?: string | null; // <-- allow primary image
}
