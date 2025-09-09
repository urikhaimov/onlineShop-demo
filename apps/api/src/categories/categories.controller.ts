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
  BadRequestException,
  ConflictException,
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
  // PUBLIC LIST  →  GET /api/categories/publiclist
  // ────────────────────────────────────────────────────────────────────────────
  @Public()
  @Get('publiclist')
  async publiclist(@Query() q: ListCategoriesDto, @Res() res: Response) {
    const { items, total } = await this.categoriesService.list(q);
    res.setHeader('X-Total-Count', String(total));
    return res.json({ items, total });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // GUARDED LIST  →  GET /api/categories
  // ────────────────────────────────────────────────────────────────────────────
  @UseGuards(FirebaseAuthGuard)
  @Get()
  async list(@Query() q: ListCategoriesDto, @Res() res: Response) {
    const { items, total } = await this.categoriesService.list(q);
    res.setHeader('X-Total-Count', String(total));
    return res.json({ items, total });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // GUARDED GET BY ID  →  GET /api/categories/:id
  // ────────────────────────────────────────────────────────────────────────────
  @UseGuards(FirebaseAuthGuard)
  @Get(':id')
  async getById(@Param('id') id: string) {
    const cat = await this.categoriesService.getById(id);
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // GUARDED CREATE  →  POST /api/categories
  // body: { name, description?, imageUrl? }
  // Enforces: document ID == name (service uses doc(name).set(...))
  // ────────────────────────────────────────────────────────────────────────────
  @UseGuards(FirebaseAuthGuard)
  @Post()
  async create(@Body() body: any) {
    const rawName = String(body?.name ?? '').trim();
    if (!rawName) throw new BadRequestException('Name is required');
    if (rawName.includes('/')) {
      // Firestore doc IDs cannot contain '/'
      throw new BadRequestException("Name cannot contain '/'");
    }

    // Service create() already stores with doc ID = name and returns { id, name, ... }
    const created = await this.categoriesService.create(rawName);
    // If you later extend service.create to accept description/imageUrl, pass them here.
    return created;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // GUARDED UPDATE  →  PUT /api/categories/:id
  // body: { name }
  // With ID==name constraint, we DO NOT allow changing the name via update,
  // because that would require recreating the document under a different ID.
  // ────────────────────────────────────────────────────────────────────────────
  @UseGuards(FirebaseAuthGuard)
  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    const rawName = String(body?.name ?? '').trim();
    if (!rawName) throw new BadRequestException('Name is required');
    if (rawName.includes('/')) {
      throw new BadRequestException("Name cannot contain '/'");
    }

    if (id !== rawName) {
      // Prevent silent drift between doc ID and name field.
      // If you want rename behavior, implement a service method that copies data
      // to a new doc (new ID), updates references, then deletes the old doc.
      throw new ConflictException(
        'To rename a category (ID == name), delete and recreate it with the new name.',
      );
    }

    // Safe: update only the name field of the SAME document
    const updated = await this.categoriesService.updateCategory(id, rawName);
    return updated;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // GUARDED DELETE  →  DELETE /api/categories/:id
  // ────────────────────────────────────────────────────────────────────────────
  @UseGuards(FirebaseAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
