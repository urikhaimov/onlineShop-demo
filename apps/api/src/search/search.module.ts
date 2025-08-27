// apps/server/src/search/search.module.ts
import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

// If you already have ProductsModule / CategoriesModule, import them here
// import { ProductsModule } from '../products/products.module';
// import { CategoriesModule } from '../categories/categories.module';

@Module({
  // imports: [ProductsModule, CategoriesModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
