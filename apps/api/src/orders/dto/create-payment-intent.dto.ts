// apps/api/src/orders/dto/create-payment-intent.dto.ts
import {
  IsInt,
  Min,
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
} from 'class-validator';

export class CreatePaymentIntentDto {
  @IsInt() @Min(1) amount!: number;
  @IsString() currency!: string;
  @IsOptional() @IsNumber() totalMajor?: number; // MAJOR (compat)
  @IsOptional() @IsArray() cart?: any[];
  @IsOptional() @IsNumber() shipping?: number;
  @IsOptional() @IsNumber() taxRate?: number; // fraction
  @IsOptional() @IsInt() @Min(0) discount?: number; // MINOR
  @IsOptional() ownerName?: string;
  @IsOptional() passportId?: string;
  @IsOptional() shippingAddress?: any;
  @IsOptional() idempotencyKey?: string;
}
