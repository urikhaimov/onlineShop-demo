import { PartialType, OmitType } from '@nestjs/mapped-types';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateProductDto } from './create-product.dto';
import { MetadataPatchDto } from './metadata.dto';

// Omit metadata from the base, then re-declare as patch type
export class UpdateProductDto extends PartialType(
  OmitType(CreateProductDto, ['metadata'] as const),
) {
  @ValidateNested()
  @Type(() => MetadataPatchDto)
  @IsOptional()
  metadata?: MetadataPatchDto; // ✅ allow updatedBy/updatedAt on update
}
