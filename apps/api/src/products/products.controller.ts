import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ProductsService, ProductWithOrder } from './products.service';
import { ReorderProductsDto } from './dto/reorder-products.dto';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard'; // or wherever your guard is
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  getAllProducts(): Promise<ProductWithOrder[]> {
    return this.productsService.findAll();
  }

  @Post()
  async create(@Body() body: { name: string; price: number; stock: number }) {
    const { name, price, stock } = body;

    if (!name?.trim() || price === null || stock === null) {
      throw new BadRequestException('Name, price, and stock are required');
    }

    return this.productsService.create({ name: name.trim(), price, stock });
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: { name?: string; price?: number; stock?: number },
  ) {
    return this.productsService.update(id, body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    const product = await this.productsService.findById(id);
    console.log('✅ Found product:', product);
    return product;
  }

  @Post('reorder')
  @UseGuards(FirebaseAuthGuard) // or your custom guard
  async reorder(@Body() dto: ReorderProductsDto, @Req() req: any) {
    return this.productsService.reorder(dto.orderList); // ✅ correct
  }
}
