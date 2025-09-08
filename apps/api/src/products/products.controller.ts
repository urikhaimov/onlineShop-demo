// src/products/products.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Delete,
  Req,
  UseGuards,
  Logger,
  Query,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { ProductsService } from './products.service';
import { SaveProductDto } from './dto/save-product.dto';
import { ReorderProductsDto } from './dto/reorder-products.dto';
import { ListProductsDto } from './dto/list-products.dto';

type AuthedReq = Request & {
  user?: { uid: string; email?: string; name?: string };
};

@Controller('products')
export class ProductsController {
  private readonly logger = new Logger(ProductsController.name);

  constructor(private readonly svc: ProductsService) {}

  /** Common sender for list endpoints */
  private sendList(res: Response, items: unknown[], total: number) {
    res.setHeader('X-Total-Count', String(total));
    res.setHeader('Cache-Control', 'no-store');
    return res.json({ items, total });
  }

  // ===========================================================================
  // PUBLIC READ — no auth
  // GET /products/public?q=&categoryId=&page=&limit=&priceMin=&priceMax=&stockMin=&stockMax=&sort=
  // ===========================================================================
  @Get('public')
  async listPublic(@Query() q: ListProductsDto, @Res() res: Response) {
    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(`[listPublic] query: ${JSON.stringify(q)}`);
    }
    const { items, total } = await this.svc.list(q);
    return this.sendList(res, items, total);
  }

  // ===========================================================================
  // ADMIN / AUTH PROTECTED
  // ===========================================================================

  // GET /products?q=&categoryId=&page=&limit=&priceMin=&priceMax=&stockMin=&stockMax=&sort=
  @UseGuards(FirebaseAuthGuard)
  @Get()
  async list(@Query() q: ListProductsDto, @Res() res: Response) {
    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(`[list] query: ${JSON.stringify(q)}`);
    }
    const { items, total } = await this.svc.list(q);
    return this.sendList(res, items, total);
  }

  @UseGuards(FirebaseAuthGuard)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.getById(id);
  }

  @UseGuards(FirebaseAuthGuard)
  @Post()
  create(@Req() req: AuthedReq, @Body() dto: SaveProductDto) {
    // Dev-only diagnostics to verify images flow through the ValidationPipe/DTO
    if (process.env.NODE_ENV !== 'production') {
      const raw = (req as any)?.body;
      this.logger.debug(
        `[create] raw.body.images length: ${
          Array.isArray(raw?.images) ? raw.images.length : 'n/a'
        }`,
      );
      this.logger.debug(
        `[create] dto.images length: ${
          Array.isArray(dto.images) ? dto.images.length : 'n/a'
        }`,
      );
    }

    const actorName = req.user?.name || req.user?.email;
    return this.svc.create(req.user!.uid, actorName, dto);
  }

  // Keep specific route BEFORE the param route
  @UseGuards(FirebaseAuthGuard)
  @Put('reorder')
  reorder(@Req() req: AuthedReq, @Body() dto: ReorderProductsDto) {
    const actorName = req.user?.name || req.user?.email;
    return this.svc.reorder(req.user!.uid, actorName, dto.orderList);
  }

  @UseGuards(FirebaseAuthGuard)
  @Put(':id')
  update(
    @Req() req: AuthedReq,
    @Param('id') id: string,
    @Body() dto: SaveProductDto,
  ) {
    // Dev-only diagnostics to verify images flow through the ValidationPipe/DTO
    if (process.env.NODE_ENV !== 'production') {
      const raw = (req as any)?.body;
      this.logger.debug(
        `[update] raw.body.images length: ${
          Array.isArray(raw?.images) ? raw.images.length : 'n/a'
        }`,
      );
      this.logger.debug(
        `[update] dto.images length: ${
          Array.isArray(dto.images) ? dto.images.length : 'n/a'
        }`,
      );
    }

    const actorName = req.user?.name || req.user?.email;
    return this.svc.update(req.user!.uid, actorName, id, dto);
  }

  @UseGuards(FirebaseAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
