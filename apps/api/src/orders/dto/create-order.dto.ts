import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

class OrderItemDto {
  @IsString() productId!: string;
  @IsString() name!: string;
  @IsNumber() price!: number; // MAJOR units
  @IsNumber() quantity!: number;
  @IsOptional() @IsString() image?: string;
}

class PaymentDto {
  @IsString() method!: string;
  @IsIn(['paid', 'unpaid']) status!: 'paid' | 'unpaid';
  @IsOptional() @IsString() transactionId?: string | null;
}

class AddressDto {
  @IsString() fullName!: string;
  @IsString() phone!: string;
  @IsString() street!: string;
  @IsString() city!: string;
  @IsString() postalCode!: string;
  @IsString() country!: string;
}

export class CreateOrderDto {
  @IsString() userId!: string;

  @IsOptional() @IsString() email?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @IsNumber() totalAmount!: number; // MINOR units

  @IsOptional() @IsString() paymentIntentId?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentDto)
  payment?: PaymentDto;

  @IsOptional()
  @IsIn(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'])
  status?: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

  @IsOptional() @IsString() ownerName?: string | null;
  @IsOptional() @IsString() passportId?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  shippingAddress?: AddressDto | null;

  @IsOptional() @IsString() notes?: string;
}
