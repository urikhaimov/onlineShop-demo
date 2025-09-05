// apps/api/src/landing-page/landing-page.controller.ts
import { Controller, Get, Put, Body, Res } from '@nestjs/common';
import type { Response } from 'express';
import { LandingPageService } from './landing-page.service';
import type { LandingPageData } from '@common/types';

@Controller('landing')
export class LandingPageController {
  constructor(private readonly svc: LandingPageService) {}

  @Get()
  async get(@Res({ passthrough: true }) res: Response) {
    res.setHeader('Cache-Control', 'no-store');
    return this.svc.get();
  }

  @Put()
  async put(
    @Body() body: LandingPageData,
    @Res({ passthrough: true }) res: Response,
  ) {
    const saved = await this.svc.update(body);
    res.setHeader('Cache-Control', 'no-store');
    return saved;
  }
}
