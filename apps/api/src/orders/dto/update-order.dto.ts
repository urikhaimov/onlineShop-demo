// apps/api/src/orders/dto/update-order.dto.ts
import {
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateDeliveryDto {
  @IsOptional() @IsString() provider?: string;
  @IsOptional() @IsString() trackingNumber?: string;
  @IsOptional() @IsString() eta?: string;
}

export class UpdateOrderDto {
  @IsOptional()
  @IsIn(['open', 'paid', 'shipped', 'delivered', 'canceled', 'refunded'])
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateDeliveryDto)
  delivery?: UpdateDeliveryDto;

  @IsOptional()
  @IsBoolean()
  notifyCustomer?: boolean;

  @IsOptional()
  @IsIn(['he', 'en'])
  locale?: 'he' | 'en';
}
