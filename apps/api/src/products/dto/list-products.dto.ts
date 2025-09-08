// apps/api/src/products/dto/list-products.dto.ts
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ListProductsDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() categoryId?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number = 20;

  @IsOptional() @Type(() => Number) priceMin?: number;
  @IsOptional() @Type(() => Number) priceMax?: number;

  @IsOptional() @Type(() => Number) stockMin?: number;
  @IsOptional() @Type(() => Number) stockMax?: number;

  /** e.g. "price:asc", "updatedAt:desc", "order:asc" */
  @IsOptional() @IsString() sort?: string;
}
