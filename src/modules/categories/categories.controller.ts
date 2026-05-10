import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { envelope } from '../../common/response-envelope';
import { AccessTokenGuard } from '../auth/access-token.guard';
import type { JwtPayload } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { FindCategoriesQueryDto } from './dto/find-categories-query.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller('categories')
@UseGuards(AccessTokenGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: FindCategoriesQueryDto,
  ) {
    return envelope(await this.categoriesService.findAll(user.sub, query));
  }

  @Post()
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() body: CreateCategoryDto,
  ) {
    return envelope(await this.categoriesService.create(user.sub, body));
  }

  @Patch(':categoryId')
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('categoryId') categoryId: string,
    @Body() body: UpdateCategoryDto,
  ) {
    return envelope(
      await this.categoriesService.update(user.sub, categoryId, body),
    );
  }

  @Delete(':categoryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async archive(
    @CurrentUser() user: JwtPayload,
    @Param('categoryId') categoryId: string,
  ) {
    await this.categoriesService.archive(user.sub, categoryId);
  }
}
