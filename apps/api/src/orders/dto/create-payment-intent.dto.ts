import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class CartItemDto {
  @IsString() productId!: string;
  @IsString() name!: string;
  @IsNumber() price!: number; // MAJOR units
  @IsNumber() quantity!: number;
  @IsOptional() @IsString() image?: string;
}

class AddressDto {
  @IsString() fullName!: string;
  @IsString() phone!: string;
  @IsString() street!: string;
  @IsString() city!: string;
  @IsString() postalCode!: string;
  @IsString() country!: string;
}

export class CreatePaymentIntentDto {
  @IsNumber() amount!: number; // MINOR units from client (we’ll recompute server-side)

  @IsOptional() @IsString() ownerName?: string;
  @IsOptional() @IsString() passportId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  cart!: CartItemDto[];

  @IsNumber() shipping!: number; // MAJOR units
  @IsNumber() taxRate!: number; // e.g. 0.17
  @IsNumber() discount!: number; // MINOR units

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  shippingAddress?: AddressDto;
}
