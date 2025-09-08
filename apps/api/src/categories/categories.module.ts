// src/categories/categories.module.ts
import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
// If your controller is guarded, import the auth module that provides the guard:
import { AuthModule } from '../auth/auth.module'; // adjust path if needed

@Module({
  imports: [AuthModule], // remove if categories are public and guard isn't used
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService], // export if other modules need the service
})
export class CategoriesModule {}
