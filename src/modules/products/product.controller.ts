import { Request, Response, NextFunction } from 'express';
import slugify from 'slugify';
import Product from './product.model';
import { ApiError } from '../../shared/utils/ApiError';
import { sendSuccess, sendPaginated } from '../../shared/utils/ApiResponse';
import { uploadToCloudinary } from '../../shared/utils/upload';

export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, price, comparePrice, category, tags, variants, stock, isFeatured } = req.body;
    const slug = slugify(name, { lower: true, strict: true });

    let images: string[] = [];
    if (req.files && Array.isArray(req.files)) {
      images = await Promise.all(
        (req.files as Express.Multer.File[]).map((file) => uploadToCloudinary(file.buffer, 'products'))
      );
    }

    const product = await Product.create({
      name, slug, description, price, comparePrice, category, tags, variants, stock, isFeatured, images,
    });
    sendSuccess(res, product, 'Product created', 201);
  } catch (error) {
    next(error);
  }
};

export const getProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { isActive: true };

    const search = req.query.search as string | undefined;

    if (req.query.search) {
      filter.$text = { $search: search };
    }
    if (req.query.category) {
      filter.category = req.query.category;
    }
    if (req.query.minPrice || req.query.maxPrice) {
      filter.price = {};
      if (req.query.minPrice) (filter.price as Record<string, number>).$gte = parseFloat(req.query.minPrice as string);
      if (req.query.maxPrice) (filter.price as Record<string, number>).$lte = parseFloat(req.query.maxPrice as string);
    }
    if (req.query.minRating) {
      filter.rating = { $gte: parseFloat(req.query.minRating as string) };
    }
    if (req.query.featured === 'true') {
      filter.isFeatured = true;
    }
    if (req.query.tags) {
      filter.tags = { $in: (req.query.tags as string).split(',') };
    }

    const sort: Record<string, 1 | -1> = {};
    if (req.query.sort) {
      const sortField = req.query.sort as string;
      sort[sortField.replace('-', '')] = sortField.startsWith('-') ? -1 : 1;
    } else {
      sort.createdAt = -1;
    }

    const [products, total] = await Promise.all([
      Product.find(filter).populate('category', 'name slug').sort(sort).skip(skip).limit(limit),
      Product.countDocuments(filter),
    ]);

    sendPaginated(res, products, total, page, limit);
  } catch (error) {
    next(error);
  }
};

export const getProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await Product.findById(req.params.id).populate('category', 'name slug');
    if (!product) throw new ApiError(404, 'Product not found');
    sendSuccess(res, product);
  } catch (error) {
    next(error);
  }
};

export const getProductBySlug = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug }).populate('category', 'name slug');
    if (!product) throw new ApiError(404, 'Product not found');
    sendSuccess(res, product);
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, price, comparePrice, category, tags, variants, stock, isFeatured, isActive } = req.body;
    const update: Record<string, unknown> = {};

    if (name) { update.name = name; update.slug = slugify(name as string, { lower: true, strict: true }); }
    if (description !== undefined) update.description = description;
    if (price !== undefined) update.price = price;
    if (comparePrice !== undefined) update.comparePrice = comparePrice;
    if (category !== undefined) update.category = category;
    if (tags !== undefined) update.tags = tags;
    if (variants !== undefined) update.variants = variants;
    if (stock !== undefined) update.stock = stock;
    if (isFeatured !== undefined) update.isFeatured = isFeatured;
    if (isActive !== undefined) update.isActive = isActive;

    if (req.files && Array.isArray(req.files) && (req.files as Express.Multer.File[]).length > 0) {
      update.images = await Promise.all(
        (req.files as Express.Multer.File[]).map((file) => uploadToCloudinary(file.buffer, 'products'))
      );
    }

    const product = await Product.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!product) throw new ApiError(404, 'Product not found');

    sendSuccess(res, { product }, 'Product updated');
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) throw new ApiError(404, 'Product not found');
    sendSuccess(res, null, 'Product deleted');
  } catch (error) {
    next(error);
  }
};

export const getFeaturedProducts = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await Product.find({ isFeatured: true, isActive: true })
      .populate('category', 'name slug')
      .sort('-rating')
      .limit(10);
    sendSuccess(res, products);
  } catch (error) {
    next(error);
  }
};
