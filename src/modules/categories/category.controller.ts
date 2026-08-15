import { Request, Response, NextFunction } from 'express';
import slugify from 'slugify';
import Category from './category.model';
import { ApiError } from '../../shared/utils/ApiError';
import { sendSuccess } from '../../shared/utils/ApiResponse';

export const createCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, parent } = req.body;
    const slug = slugify(name, { lower: true });
    const category = await Category.create({ name, slug, description, parent });
    sendSuccess(res, category, 'Category created', 201);
  } catch (error) {
    next(error);
  }
};

export const getCategories = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await Category.find({ isActive: true }).populate('parent', 'name slug').sort('name');
    sendSuccess(res, categories);
  } catch (error) {
    next(error);
  }
};

export const getCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const category = await Category.findById(req.params.id).populate('parent', 'name slug');
    if (!category) throw new ApiError(404, 'Category not found');
    sendSuccess(res, category);
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, parent, isActive } = req.body;
    const update: Record<string, unknown> = {};
    if (name) { update.name = name; update.slug = slugify(name as string, { lower: true }); }
    if (description !== undefined) update.description = description;
    if (parent !== undefined) update.parent = parent;
    if (isActive !== undefined) update.isActive = isActive;

    const category = await Category.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!category) throw new ApiError(404, 'Category not found');
    sendSuccess(res, category, 'Category updated');
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) throw new ApiError(404, 'Category not found');
    sendSuccess(res, null, 'Category deleted');
  } catch (error) {
    next(error);
  }
};
