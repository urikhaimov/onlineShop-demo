// src/products/dto/save-product.dto.ts
import { IsArray, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class SaveProductDto {
  @IsString() name!: string;
  @IsString() description!: string;
  @IsString() categoryId!: string;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsNumber()
  @Min(0)
  stock!: number;

  @IsArray()
  images!: string[];

  @IsOptional()
  @IsString()
  imageUrl?: string; // optional primary image if you use it in cards
}
