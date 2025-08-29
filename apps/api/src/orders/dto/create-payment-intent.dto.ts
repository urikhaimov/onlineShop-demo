// src/orders/dto/create-payment-intent.dto.ts
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class CartItemDto {
  @IsString()
  productId!: string;

  @IsString()
  name!: string;

  @IsNumber()
  price!: number; // MAJOR units (e.g., ₪)

  @IsOptional()
  @IsString()
  image?: string;

  @IsInt()
  @Min(0)
  quantity!: number;
}

class ShippingAddressDto {
  @IsString()
  fullName!: string;

  @IsString()
  phone!: string;

  @IsString()
  street!: string;

  @IsString()
  city!: string;

  @IsString()
  postalCode!: string;

  @IsString()
  country!: string;
}

export class CreatePaymentIntentDto {
  // Amount in MINOR units (agorot/cents)
  @IsInt()
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsString()
  ownerName?: string;

  @IsOptional()
  @IsString()
  passportId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  cart!: CartItemDto[];

  // Shipping in MAJOR units (₪)
  @IsNumber()
  @Min(0)
  shipping!: number;

  // e.g., 0.17 for 17%
  @IsNumber()
  @Min(0)
  @Max(1)
  taxRate!: number;

  // Discount in MINOR units
  @IsInt()
  @Min(0)
  discount!: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress?: ShippingAddressDto;
}
