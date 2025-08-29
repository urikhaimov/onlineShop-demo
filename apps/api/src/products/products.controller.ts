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
} from '@nestjs/common';
import { Request } from 'express';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { ProductsService } from './products.service';
import { SaveProductDto } from './dto/save-product.dto';

type AuthedReq = Request & {
  user: { uid: string; email?: string; name?: string };
};

@Controller('products')
@UseGuards(FirebaseAuthGuard)
export class ProductsController {
  constructor(private readonly svc: ProductsService) {}

  @Get()
  list() {
    return this.svc.getAll();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.getById(id);
  }

  @Post()
  create(@Req() req: AuthedReq, @Body() dto: SaveProductDto) {
    const actorName = req.user?.name || req.user?.email;
    return this.svc.create(req.user.uid, actorName, dto);
  }

  @Put(':id')
  update(
    @Req() req: AuthedReq,
    @Param('id') id: string,
    @Body() dto: SaveProductDto,
  ) {
    const actorName = req.user?.name || req.user?.email;
    return this.svc.update(req.user.uid, actorName, id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
