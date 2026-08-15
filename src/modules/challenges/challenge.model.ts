import mongoose, { Document, Schema } from 'mongoose';

export interface IChallenge extends Document {
  key: string;
  name: string;
  description: string;
  category: string;
  difficulty: number;
  challengeType: 'black-box' | 'white-box' | 'grey-box';
  tags: string[];
  owaspCategory: string;
  cwe: string;
  endpoint: string;
  httpMethod: string;
}

const challengeSchema = new Schema<IChallenge>(
  {
    key: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    category: {
      type: String,
      required: true,
      enum: ['bac', 'logic', 'mass-assignment'],
    },
    difficulty: { type: Number, min: 1, max: 5, default: 3 },
    challengeType: {
      type: String,
      enum: ['black-box', 'white-box', 'grey-box'],
      default: 'black-box',
    },
    tags: { type: [String], default: [] },
    owaspCategory: { type: String, default: '' },
    cwe: { type: String, default: '' },
    endpoint: { type: String, default: '' },
    httpMethod: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model<IChallenge>('Challenge', challengeSchema);