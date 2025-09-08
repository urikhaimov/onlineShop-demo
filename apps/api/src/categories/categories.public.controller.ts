// src/categories/categories.public.controller.ts
import { Controller, Get, Query, Res, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { CategoriesService } from './categories.service';
import { ListCategoriesDto } from './dto/list-categories.dto';

@Controller('categories/public')
export class CategoriesPublicController {
  private readonly logger = new Logger(CategoriesPublicController.name);
  constructor(private readonly svc: CategoriesService) {}

  @Get()
  async list(@Query() q: ListCategoriesDto, @Res() res: Response) {
    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(`[public list] query: ${JSON.stringify(q)}`);
    }
    const { items, total } = await this.svc.list(q);
    res.setHeader('X-Total-Count', String(total));
    return res.json({ items, total });
  }
}
