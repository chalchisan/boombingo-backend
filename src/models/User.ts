import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  telegramId: string;
  username: string;
  phone: string;
  firstName: string;
  lastName?: string;
  photoUrl?: string;
  mainBalance: number;
  bonusBalance: number;
  coins: number;
  totalWins: number;
  totalGamesPlayed: number;
  referralCode: string;
  referredBy?: string;
  referralCount: number;
  lastLoginBonus?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  telegramId: { type: String, required: true, unique: true, index: true },
  username: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String },
  photoUrl: { type: String },
  mainBalance: { type: Number, default: 0, min: 0 },
  bonusBalance: { type: Number, default: 0, min: 0 },
  coins: { type: Number, default: 0, min: 0 },
  totalWins: { type: Number, default: 0 },
  totalGamesPlayed: { type: Number, default: 0 },
  referralCode: { type: String, unique: true },
  referredBy: { type: String },
  referralCount: { type: Number, default: 0 },
  lastLoginBonus: { type: Date },
}, { timestamps: true });

export default mongoose.model<IUser>('User', UserSchema);
