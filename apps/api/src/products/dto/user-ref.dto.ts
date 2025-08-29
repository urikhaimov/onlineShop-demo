// dto/user-ref.dto.ts
import { IsString } from 'class-validator';

export class UserRefDto {
  @IsString()
  uid!: string;

  @IsString()
  name!: string;
}
