// dto/create-intent.dto.ts
import {
  IsArray,
  ValidateNested,
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsEmail,
} from 'class-validator';
import { Type } from 'class-transformer';

class CartItemDto {
  @IsString() id!: string;
  @IsInt() @Min(1) qty!: number;
}

export class CreateIntentDto {
  @IsString() cartId!: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items!: CartItemDto[];
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsEmail() customerEmail?: string | null;
}
