import mongoose from 'mongoose';
import { getMongoUri } from './embeddedMongo';
import Review from '../modules/reviews/review.model';

const connectDB = async (): Promise<void> => {
  try {
    const uri = await getMongoUri();
    await mongoose.connect(uri);
    console.log('MongoDB connected successfully');

    // Drop obsolete indexes (e.g. the old unique user+product review index so
    // multiple reviews per user per product are allowed going forward)
    await Review.syncIndexes();
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

export default connectDB;
