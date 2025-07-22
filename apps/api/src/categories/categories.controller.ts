import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  getAllCategories() {
    return this.categoriesService.findAll();
  }

  @Post()
  async create(@Body('name') name: string) {
    if (!name || !name.trim()) {
      throw new BadRequestException('Name is required');
    }
    return this.categoriesService.create(name.trim());
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: { name: string }) {
    return this.categoriesService.updateCategory(id, body.name);
  }
}
