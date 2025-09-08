// src/categories/categories.controller.ts
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { CategoriesService } from './categories.service';
import { ListCategoriesDto } from './dto/list-categories.dto';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';

@Controller('categories')
@UseGuards(FirebaseAuthGuard) // remove this line if categories should be public
export class CategoriesController {
  private readonly logger = new Logger(CategoriesController.name);
  constructor(private readonly categoriesService: CategoriesService) {}

  // GET /categories?q=&page=&limit=&sort=
  @Get()
  async list(@Query() q: ListCategoriesDto, @Res() res: Response) {
    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(`[list] query: ${JSON.stringify(q)}`);
    }
    const { items, total } = await this.categoriesService.list(q);
    res.setHeader('X-Total-Count', String(total));
    return res.json({ items, total });
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    const doc = await this.categoriesService.getById(id);
    if (!doc) throw new NotFoundException('Category not found');
    return doc;
  }

  @Post()
  async create(@Body('name') name: string) {
    if (!name || !name.trim()) {
      throw new BadRequestException('Name is required');
    }
    return this.categoriesService.create(name.trim());
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: { name: string }) {
    return this.categoriesService.updateCategory(id, body?.name);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
