import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  user: mongoose.Types.ObjectId;
  nid: number;
  type: 'order' | 'promotion' | 'system';
  title: string;
  message: string;
  isRead: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const counterSchema = new Schema({ _id: String, seq: { type: Number, default: 0 } });
export const NotificationCounter = mongoose.model('NotificationCounter', counterSchema);

const notificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    nid: { type: Number },
    type: {
      type: String,
      enum: ['order', 'promotion', 'system'],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

notificationSchema.index({ nid: 1 }, { unique: true });
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, isRead: 1 });

notificationSchema.pre('save', async function () {
  if (!this.isNew || this.nid) return;
  const counter = await NotificationCounter.findByIdAndUpdate(
    'notifications',
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  this.nid = counter!.seq;
});

export default mongoose.model<INotification>('Notification', notificationSchema);