import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Logger,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ProductsService } from './products.service';
import { SaveProductDto } from './dto/save-product.dto';
import { ReorderProductsDto } from './dto/reorder-products.dto';
import { ListProductsDto } from './dto/list-products.dto';
import { SecurityLogsService } from '../security-logs/security-logs.service';

type AuthedReq = Request & {
  user?: { uid: string; email?: string; name?: string };
};

@Controller('products')
export class ProductsController {
  private readonly logger = new Logger(ProductsController.name);

  constructor(
    @Inject(ProductsService) private readonly svc: ProductsService,
    @Inject(SecurityLogsService)
    private readonly auditLog: SecurityLogsService,
  ) {}

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

  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  @Post()
  async create(@Req() req: AuthedReq, @Body() dto: SaveProductDto) {
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
    const result = await this.svc.create(req.user!.uid, actorName, dto);

    void this.auditLog.log({
      type: 'PRODUCT_CREATED',
      details: `Created product '${dto.name ?? '(no name)'}'`,
      collection: 'products',
      affectedDocId: (result as any)?.id ?? '(unknown)',
      actor: { uid: req.user?.uid, email: req.user?.email },
    });

    return result;
  }

  // Keep specific route BEFORE the param route
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  @Put('reorder')
  async reorder(@Req() req: AuthedReq, @Body() dto: ReorderProductsDto) {
    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(`[reorder] body: ${JSON.stringify(dto)}`);
    }
    const actorName = req.user?.name || req.user?.email;
    const result = await this.svc.reorder(
      req.user!.uid,
      actorName,
      dto.orderList,
    );

    void this.auditLog.log({
      type: 'PRODUCT_REORDERED',
      details: `Reordered ${dto.orderList?.length ?? 0} products`,
      collection: 'products',
      affectedDocId: 'bulk',
      actor: { uid: req.user?.uid, email: req.user?.email },
    });

    return result;
  }

  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  @Put(':id')
  async update(
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
    const result = await this.svc.update(req.user!.uid, actorName, id, dto);

    void this.auditLog.log({
      type: 'PRODUCT_UPDATED',
      details: `Updated product '${dto.name ?? id}'`,
      collection: 'products',
      affectedDocId: id,
      actor: { uid: req.user?.uid, email: req.user?.email },
    });

    return result;
  }

  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  @Delete(':id')
  async remove(@Req() req: AuthedReq, @Param('id') id: string) {
    const result = await this.svc.remove(id);

    void this.auditLog.log({
      type: 'PRODUCT_DELETED',
      details: `Deleted product ${id}`,
      collection: 'products',
      affectedDocId: id,
      actor: { uid: req.user?.uid, email: req.user?.email },
    });

    return result;
  }
}
