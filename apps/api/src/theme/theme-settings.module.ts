import { Module } from '@nestjs/common';
import { ThemeSettingsController } from './theme-settings.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ThemeSettingsController],
})
export class ThemeSettingsModule {}
