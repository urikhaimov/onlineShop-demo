// src/products/dto/reorder-products.dto.ts
import { IsArray, ValidateNested, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ReorderItemDto {
  @IsString()
  id!: string;

  @Type(() => Number) // ← coerce string -> number if needed
  @IsInt()
  @Min(0)
  order!: number;
}

export class ReorderProductsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderItemDto)
  orderList!: ReorderItemDto[];
}
