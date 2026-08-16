import { Request, Response, NextFunction } from 'express';
import Cart from './cart.model';
import Product from '../products/product.model';
import { ApiError } from '../../shared/utils/ApiError';
import { sendSuccess } from '../../shared/utils/ApiResponse';

// VULNERABILITY (idor-read-cart): an optional userId query parameter overrides
// the caller's identity — any authenticated user can read any user's cart.
export const getCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const targetId = (req.query.userId as string) || req.user!.userId;
    let cart = await Cart.findOne({ user: targetId }).populate('items.product', 'name price images stock slug');
    if (!cart) {
      cart = await Cart.create({ user: targetId, items: [], total: 0 });
    }
    sendSuccess(res, serializeCart(cart));
  } catch (error) {
    next(error);
  }
};

const round2 = (n: number) => Math.round(n * 100) / 100;

// The per-line amount the client actually pays: unit price × quantity minus the
// discount rate. Exposed in every cart response so the tester can read the
// pricing formula (unit × qty × (1 − discountPercent/100)) straight from Burp.
const lineTotal = (price: number, quantity: number, discountPercent: number) =>
  round2(price * quantity * (1 - discountPercent / 100));

const serializeCart = (cart: any) => ({
  _id: cart._id,
  user: cart.user,
  total: cart.total,
  createdAt: cart.createdAt,
  updatedAt: cart.updatedAt,
  items: (cart.items || []).map((item: any) => ({
    _id: item._id,
    product: item.product,
    variant: item.variant,
    quantity: item.quantity,
    price: item.price,
    discountPercent: item.discountPercent ?? 0,
    lineTotal: lineTotal(item.price, item.quantity, item.discountPercent ?? 0),
  })),
});

export const addToCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { product: productId, quantity, variant } = req.body;
    const product = await Product.findById(productId);
    if (!product) throw new ApiError(404, 'Product not found');
    if (!product.isActive) throw new ApiError(400, 'Product is not available');

    // VULNERABILITY (trust-client-price): the price sent by the client is used
    // as-is instead of the catalog price — an attacker adds an item with
    // "price": 0.01 and pays one cent for it.
    let price = typeof req.body.price === 'number' ? req.body.price : product.price;

    // VULNERABILITY (trust-client-discount): the discountPercent sent by the
    // client is trusted as-is instead of re-deriving it from the product
    // catalog. The legitimate request carries the 5% store discount — an
    // attacker raises it (5 → 90) and the line total collapses.
    const discountPercent =
      typeof req.body.discountPercent === 'number' ? req.body.discountPercent : (product.discountPercent ?? 0);

    // VULNERABILITY (quantity-not-validated): quantity is never validated —
    // negative, zero or decimal quantities are accepted, making the cart total
    // negative or trivially small (and restoring stock on checkout).
    if (variant) {
      const foundVariant = product.variants.find((v) => v.name === variant.name);
      const foundOption = foundVariant?.options.find((o) => o.label === variant.label);
      if (!foundOption) throw new ApiError(400, 'Variant option not found');
      if (foundOption.stock < quantity) throw new ApiError(400, 'Insufficient variant stock');
      if (typeof req.body.price !== 'number') {
        price += foundOption.priceAdjust;
      }
    } else if (product.stock < quantity) {
      throw new ApiError(400, 'Insufficient stock');
    }

    let cart = await Cart.findOne({ user: req.user!.userId });
    if (!cart) {
      cart = new Cart({ user: req.user!.userId, items: [] });
    }

    const existingItem = cart.items.find(
      (item) =>
        item.product.toString() === productId &&
        item.variant?.name === variant?.name &&
        item.variant?.label === variant?.label
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({ product: productId, quantity, variant, price, discountPercent });
    }

    cart.total = cart.items.reduce(
      (sum, item) => sum + lineTotal(item.price, item.quantity, item.discountPercent ?? 0),
      0
    );
    await cart.save();

    cart = await cart.populate('items.product', 'name price images stock slug');
    sendSuccess(res, serializeCart(cart), 'Item added to cart');
  } catch (error) {
    next(error);
  }
};

export const updateCartItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cart = await Cart.findOne({ user: req.user!.userId });
    if (!cart) throw new ApiError(404, 'Cart not found');

    const item = cart.items.find((i) => i._id?.toString() === req.params.itemId);
    if (!item) throw new ApiError(404, 'Item not found in cart');

    const { quantity } = req.body;
    if (quantity < 1) throw new ApiError(400, 'Quantity must be at least 1');
    item.quantity = quantity;

    cart.total = cart.items.reduce(
      (sum, i) => sum + lineTotal(i.price, i.quantity, i.discountPercent ?? 0),
      0
    );
    await cart.save();

    const populated = await cart.populate('items.product', 'name price images stock slug');
    sendSuccess(res, serializeCart(populated), 'Cart updated');
  } catch (error) {
    next(error);
  }
};

export const removeFromCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cart = await Cart.findOne({ user: req.user!.userId });
    if (!cart) throw new ApiError(404, 'Cart not found');

    cart.items = cart.items.filter((item) => item._id?.toString() !== req.params.itemId);
    cart.total = cart.items.reduce(
      (sum, item) => sum + lineTotal(item.price, item.quantity, item.discountPercent ?? 0),
      0
    );
    await cart.save();

    const populated = await cart.populate('items.product', 'name price images stock slug');
    sendSuccess(res, serializeCart(populated), 'Item removed from cart');
  } catch (error) {
    next(error);
  }
};

export const clearCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cart = await Cart.findOne({ user: req.user!.userId });
    if (cart) {
      cart.items = [];
      cart.total = 0;
      await cart.save();
    }
    sendSuccess(res, null, 'Cart cleared');
  } catch (error) {
    next(error);
  }
};
