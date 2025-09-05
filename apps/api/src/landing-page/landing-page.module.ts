import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module'; // ✅ add this
import { LandingPageService } from './landing-page.service';
import { LandingPageController } from './landing-page.controller';

@Module({
  imports: [DatabaseModule], // ✅ Firestore now available here
  providers: [LandingPageService],
  controllers: [LandingPageController],
})
export class LandingPageModule {}
