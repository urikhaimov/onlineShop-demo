// dto/create-intent.dto.ts
import {
  IsArray,
  ValidateNested,
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsEmail,
  ArrayMinSize,
  ArrayMaxSize,
  ArrayUnique,
  IsIn,
  IsNumber,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

class CartItemDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  id!: string;

  // Accept qty or quantity; coerce to number
  @Transform(({ obj, value }) => (value !== undefined ? value : obj.quantity))
  @Type(() => Number)
  @IsInt()
  @Min(1)
  qty!: number;
}

export class CreateIntentDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  cartId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100) // keep payloads sane
  @ArrayUnique((i: CartItemDto) => i.id) // no duplicate product ids
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items!: CartItemDto[];

  // Normalize and restrict to supported currencies
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsIn(['ils', 'usd'], { message: 'currency must be ils or usd' })
  currency?: 'ils' | 'usd';

  // Trim/lowercase; IsOptional lets null/undefined pass
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  customerEmail?: string | null;

  // Optional: if ever accepted from client (prefer computing server-side!)
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  shipping?: number;
}
