import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { CategoryResponse } from './categories.types';
import { CreateCategoryDto } from './dto/create-category.dto';
import { FindCategoriesQueryDto } from './dto/find-categories-query.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category, CategoryDocument } from './schemas/category.schema';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  async findAll(
    userId: string,
    query: FindCategoriesQueryDto,
  ): Promise<CategoryResponse[]> {
    const categories = await this.categoryModel
      .find({
        $or: [{ userId: new Types.ObjectId(userId) }, { userId: null }],
        ...(query.includeArchived ? {} : { isArchived: false }),
        ...(query.type ? { type: query.type } : {}),
      })
      .sort({ isDefault: -1, createdAt: 1 });

    return categories.map((category) => this.toCategoryResponse(category));
  }

  async create(userId: string, payload: CreateCategoryDto) {
    const category = await this.categoryModel.create({
      color: payload.color,
      icon: payload.icon,
      name: payload.name.trim(),
      type: payload.type,
      userId: new Types.ObjectId(userId),
    });

    return this.toCategoryResponse(category);
  }

  async update(userId: string, categoryId: string, payload: UpdateCategoryDto) {
    const category = await this.categoryModel.findOneAndUpdate(
      {
        _id: this.toObjectId(categoryId),
        isArchived: false,
        isDefault: false,
        userId: new Types.ObjectId(userId),
      },
      this.getUpdatePayload(payload),
      { new: true },
    );

    if (!category) {
      throw new NotFoundException('Kategori tidak ditemukan');
    }

    return this.toCategoryResponse(category);
  }

  async archive(userId: string, categoryId: string) {
    const category = await this.categoryModel.findOneAndUpdate(
      {
        _id: this.toObjectId(categoryId),
        isArchived: false,
        isDefault: false,
        userId: new Types.ObjectId(userId),
      },
      { isArchived: true },
    );

    if (!category) {
      throw new NotFoundException('Kategori tidak ditemukan');
    }
  }

  private getUpdatePayload(payload: UpdateCategoryDto) {
    return {
      ...(payload.color ? { color: payload.color } : {}),
      ...(payload.icon ? { icon: payload.icon } : {}),
      ...(payload.name ? { name: payload.name.trim() } : {}),
    };
  }

  private toCategoryResponse(category: CategoryDocument): CategoryResponse {
    return {
      color: category.color,
      icon: category.icon,
      id: category.id,
      isDefault: category.isDefault,
      name: category.name,
      type: category.type,
    };
  }

  private toObjectId(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Kategori tidak ditemukan');
    }

    return new Types.ObjectId(id);
  }
}
