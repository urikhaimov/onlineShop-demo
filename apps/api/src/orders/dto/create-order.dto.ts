// src/orders/dto/create-order.dto.ts
import { Type } from 'class-transformer';
import {
  IsArray,
  ValidateNested,
  IsString,
  IsNumber,
  IsOptional,
  IsEmail,
  Min,
  IsIn,
} from 'class-validator';

class OrderItemDto {
  @IsString() productId!: string;
  @IsString() name!: string;
  @IsNumber() price!: number;
  @IsNumber() @Min(1) quantity!: number;
  @IsString() @IsOptional() image?: string;
}

class ShippingAddressDto {
  @IsString() fullName!: string;
  @IsString() phone!: string;
  @IsString() street!: string;
  @IsString() city!: string;
  @IsString() postalCode!: string;
  @IsString() country!: string; // Prefer ISO-2 (e.g., IL, US)
}

class PaymentSummaryDto {
  @IsString() method!: string; // 'card' etc.
  @IsIn(['paid', 'unpaid']) status!: 'paid' | 'unpaid';
  @IsString() @IsOptional() transactionId?: string;
}

export class CreateOrderDto {
  @IsString() userId!: string;

  @IsEmail() @IsOptional() email?: string;

  /** total amount in cents */
  @IsNumber() totalAmount!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @IsString() @IsOptional() paymentIntentId?: string;

  @ValidateNested()
  @Type(() => PaymentSummaryDto)
  @IsOptional()
  payment?: PaymentSummaryDto;

  @IsString() @IsOptional() ownerName?: string;
  @IsString() @IsOptional() passportId?: string;

  @ValidateNested()
  @Type(() => ShippingAddressDto)
  @IsOptional()
  shippingAddress?: ShippingAddressDto;

  @IsString() @IsOptional() notes?: string;

  @IsIn(['pending', 'paid', 'failed'])
  status!: 'pending' | 'paid' | 'failed';
}
