// src/categories/categories.controller.ts
import { Public } from '../auth/public.decorator';
import { UseGuards, Controller, Get, Query, Res, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { ListCategoriesDto } from './dto/list-categories.dto';
import { CategoriesService } from './categories.service';

@Controller('categories')
// ❌ remove this if you want public endpoints on this controller:
// @UseGuards(FirebaseAuthGuard)
export class CategoriesController {
  private readonly logger = new Logger(CategoriesController.name);
  constructor(private readonly categoriesService: CategoriesService) {}

  // ✅ PUBLIC
  @Public()
  @Get('publiclist')
  async publiclist(@Query() q: ListCategoriesDto, @Res() res: Response) {
    const { items, total } = await this.categoriesService.list(q);
    res.setHeader('X-Total-Count', String(total));
    return res.json({ items, total });
  }

  // 🔒 GUARDED
  @UseGuards(FirebaseAuthGuard)
  @Get()
  async list(@Query() q: ListCategoriesDto, @Res() res: Response) {
    const { items, total } = await this.categoriesService.list(q);
    res.setHeader('X-Total-Count', String(total));
    return res.json({ items, total });
  }
}
