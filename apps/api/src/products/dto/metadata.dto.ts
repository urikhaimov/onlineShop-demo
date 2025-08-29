import { IsISO8601, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UserRefDto } from './user-ref.dto';

// full metadata for create
export class MetadataDto {
  @ValidateNested()
  @Type(() => UserRefDto)
  createdBy!: UserRefDto;

  @ValidateNested()
  @Type(() => UserRefDto)
  updatedBy!: UserRefDto;

  @IsISO8601()
  createdAt!: string; // ISO string from client

  @IsISO8601()
  updatedAt!: string;
}

// patch for update (only what changes on edit)
export class MetadataPatchDto {
  @ValidateNested()
  @Type(() => UserRefDto)
  updatedBy!: UserRefDto;

  @IsISO8601()
  updatedAt!: string;
}
