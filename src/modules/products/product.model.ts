import mongoose, { Document, Schema } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  slug: string;
  description: string;
  price: number;
  comparePrice?: number;
  discountPercent: number;
  costPrice: number;
  internalNotes?: string;
  images: string[];
  category: mongoose.Types.ObjectId;
  tags: string[];
  variants: {
    name: string;
    options: { label: string; priceAdjust: number; stock: number }[];
  }[];
  stock: number;
  sold: number;
  rating: number;
  numReviews: number;
  isFeatured: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    comparePrice: { type: Number, min: 0 },
    // Legitimate store-wide discount (5%): a public business feature the
    // frontend displays and sends along with the cart request. The backend
    // should re-derive the discounted price from this field, but instead it
    // trusts the client's copy (LOG-01: trusted client price & discount).
    discountPercent: { type: Number, default: 5, min: 0, max: 100 },
    // Internal fields — the margin and the buyer's confidential notes should
    // never reach the public product API, but they ride along in the response
    // (BOPLA: broken object property level authorization).
    costPrice: { type: Number, default: 0 },
    internalNotes: { type: String, default: '' },
    images: [{ type: String }],
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    tags: [{ type: String, lowercase: true }],
    variants: [
      {
        name: { type: String, required: true },
        options: [
          {
            label: { type: String, required: true },
            priceAdjust: { type: Number, default: 0 },
            stock: { type: Number, default: 0 },
          },
        ],
      },
    ],
    stock: { type: Number, required: true, default: 0 },
    sold: { type: Number, default: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    numReviews: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, price: 1, rating: -1 });

export default mongoose.model<IProduct>('Product', productSchema);
