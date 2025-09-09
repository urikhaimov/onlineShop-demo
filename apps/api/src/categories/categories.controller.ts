// src/categories/categories.controller.ts
import {
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
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { Public } from '../auth/public.decorator';
import { ListCategoriesDto } from './dto/list-categories.dto';
import { CategoriesService } from './categories.service';

@Controller('categories')
export class CategoriesController {
  private readonly logger = new Logger(CategoriesController.name);
  constructor(private readonly categoriesService: CategoriesService) {}

  // ────────────────────────────────────────────────────────────────────────────
  // PUBLIC LIST  →  /api/categories/publiclist
  // ────────────────────────────────────────────────────────────────────────────
  @Public()
  @Get('publiclist')
  async publiclist(@Query() q: ListCategoriesDto, @Res() res: Response) {
    const { items, total } = await this.categoriesService.list(q);
    res.setHeader('X-Total-Count', String(total));
    return res.json({ items, total });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // GUARDED LIST  →  /api/categories
  // ────────────────────────────────────────────────────────────────────────────
  @UseGuards(FirebaseAuthGuard)
  @Get()
  async list(@Query() q: ListCategoriesDto, @Res() res: Response) {
    const { items, total } = await this.categoriesService.list(q);
    res.setHeader('X-Total-Count', String(total));
    return res.json({ items, total });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // GUARDED GET BY ID  →  /api/categories/:id
  // ────────────────────────────────────────────────────────────────────────────
  @UseGuards(FirebaseAuthGuard)
  @Get(':id')
  async getById(@Param('id') id: string) {
    const cat = await this.categoriesService.getById(id);
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // GUARDED CREATE  →  /api/categories
  // body: { name, description?, imageUrl? }
  // ────────────────────────────────────────────────────────────────────────────
  @UseGuards(FirebaseAuthGuard)
  @Post()
  async create(@Body() body: any) {
    const { name } = body ?? {};
    // create() currently only sets name; extend if you add fields there
    const created = await this.categoriesService.create(String(name ?? ''));
    // optional: update extra fields right after creation
    if (body?.description || body?.imageUrl) {
      await this.categoriesService.updateCategory(created.id, created.name);
      // if you add an update(data) method later, call it here to persist description/imageUrl
    }
    return created;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // GUARDED UPDATE  →  /api/categories/:id
  // body: { name, description?, imageUrl? }
  // (service currently updates name; extend service to update other fields)
  // ────────────────────────────────────────────────────────────────────────────
  @UseGuards(FirebaseAuthGuard)
  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    const { name, description, imageUrl } = body ?? {};
    // update name via existing method
    const updated = await this.categoriesService.updateCategory(
      id,
      String(name ?? ''),
    );
    // if you decide to support description/imageUrl, add a method on the service:
    // await this.categoriesService.patch(id, { description, imageUrl })
    return { ...updated, description, imageUrl };
  }

  // ────────────────────────────────────────────────────────────────────────────
  // GUARDED DELETE  →  /api/categories/:id
  // ────────────────────────────────────────────────────────────────────────────
  @UseGuards(FirebaseAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
