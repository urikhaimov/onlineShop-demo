import {
  Controller,
  DefaultValuePipe,
  Get,
  Inject,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SecurityLog, SecurityLogsService } from './security-logs.service';

@Controller('admin/security-logs')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Roles('admin', 'superadmin')
export class SecurityLogsController {
  constructor(
    @Inject(SecurityLogsService)
    private readonly svc: SecurityLogsService,
  ) {}

  @Get()
  list(
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
  ): Promise<SecurityLog[]> {
    return this.svc.list(limit);
  }
}
