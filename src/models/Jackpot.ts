import mongoose, { Document, Schema } from 'mongoose';

export interface IJackpot extends Document {
  stake: number;
  amount: number;
  maxAmount: number;
  updatedAt: Date;
}

const JackpotSchema = new Schema<IJackpot>({
  stake: { type: Number, required: true, unique: true },
  amount: { type: Number, default: 0 },
  maxAmount: { type: Number, default: 1000 },
}, { timestamps: true });

export default mongoose.model<IJackpot>('Jackpot', JackpotSchema);
