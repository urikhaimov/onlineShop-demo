// apps/api/src/products/dto/list-products.dto.ts
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class ListProductsDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() categoryId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit = 20;

  @IsOptional() @Type(() => Number) priceMin?: number;
  @IsOptional() @Type(() => Number) priceMax?: number;

  @IsOptional() @Type(() => Number) stockMin?: number;
  @IsOptional() @Type(() => Number) stockMax?: number;

  /**
   * e.g. "price:asc", "updatedAt:desc", "order:asc"
   * Normalized to "<field>:asc|desc" (lowercased dir) or undefined if invalid.
   */
  @IsOptional()
  @IsString()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return undefined;
    const m = value.match(/^([A-Za-z0-9._-]+):(asc|desc)$/i);
    return m ? `${m[1]}:${m[2].toLowerCase()}` : undefined;
  })
  sort?: string;
}
