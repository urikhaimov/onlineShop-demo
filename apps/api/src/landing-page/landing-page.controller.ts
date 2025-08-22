import { Body, Controller, Get, Put } from '@nestjs/common';
import { LandingPageService } from './landing-page.service';
import { LandingPageData } from './types';

@Controller('landing') // <- /api/landing (with global prefix)
export class LandingPageController {
  constructor(private readonly svc: LandingPageService) {}

  @Get()
  getLandingPage(): LandingPageData {
    return this.svc.get();
  }

  @Put()
  updateLandingPage(@Body() body: LandingPageData): LandingPageData {
    return this.svc.update(body);
  }
}
