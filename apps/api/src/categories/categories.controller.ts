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
import { Public } from '../auth/public.decorator';

@Controller('categories')
@UseGuards(FirebaseAuthGuard) // controller is protected by default
export class CategoriesController {
  private readonly logger = new Logger(CategoriesController.name);
  constructor(private readonly categoriesService: CategoriesService) {}

  // --- PUBLIC: GET /categories/public?q=&page=&limit=&sort= -------------
  @Public()
  @Get('public')
  async listPublic(@Query() q: ListCategoriesDto, @Res() res: Response) {
    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(`[listPublic] query: ${JSON.stringify(q)}`);
    }
    const { items, total } = await this.categoriesService.list(q);
    res.setHeader('X-Total-Count', String(total));
    return res.json({ items, total });
  }

  // --- AUTH REQUIRED: GET /categories -----------------------------------
  @Get()
  async list(@Query() q: ListCategoriesDto, @Res() res: Response) {
    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(`[list] query: ${JSON.stringify(q)}`);
    }
    const { items, total } = await this.categoriesService.list(q);
    res.setHeader('X-Total-Count', String(total));
    return res.json({ items, total });
  }

  // --- AUTH REQUIRED: GET /categories/:id --------------------------------
  @Get(':id')
  async getById(@Param('id') id: string) {
    const doc = await this.categoriesService.getById(id);
    if (!doc) throw new NotFoundException('Category not found');
    return doc;
  }

  // --- AUTH REQUIRED: POST /categories -----------------------------------
  @Post()
  async create(@Body('name') name: string) {
    if (!name || !name.trim()) {
      throw new BadRequestException('Name is required');
    }
    return this.categoriesService.create(name.trim());
  }

  // --- AUTH REQUIRED: PUT /categories/:id ---------------------------------
  @Put(':id')
  async update(@Param('id') id: string, @Body() body: { name: string }) {
    return this.categoriesService.updateCategory(id, body?.name);
  }

  // --- AUTH REQUIRED: DELETE /categories/:id ------------------------------
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
