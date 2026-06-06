import { Global, Module } from '@nestjs/common';
import { SecurityLogsController } from './security-logs.controller';
import { SecurityLogsService } from './security-logs.service';

/**
 * Marked @Global so other modules (auth, users, products, orders) can inject
 * SecurityLogsService without needing to add SecurityLogsModule to every
 * imports[] array.
 */
@Global()
@Module({
  controllers: [SecurityLogsController],
  providers: [SecurityLogsService],
  exports: [SecurityLogsService],
})
export class SecurityLogsModule {}
