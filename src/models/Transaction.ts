import mongoose, { Document, Schema } from 'mongoose';

export type TransactionType = 'deposit' | 'withdraw' | 'win' | 'loss' | 'transfer_in' | 'transfer_out' | 'bonus' | 'referral';
export type TransactionStatus = 'pending' | 'completed' | 'failed';
export type PaymentMethod = 'telebirr' | 'cbe' | 'awash' | 'dashen' | 'abyssinia';

export interface ITransaction extends Document {
  userId: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  paymentMethod?: PaymentMethod;
  reference?: string;
  note?: string;
  gameId?: string;
  relatedUserId?: string;
  balanceAfter: number;
  createdAt: Date;
}

const TransactionSchema = new Schema<ITransaction>({
  userId: { type: String, required: true, index: true },
  type: { type: String, required: true, enum: ['deposit','withdraw','win','loss','transfer_in','transfer_out','bonus','referral'] },
  amount: { type: Number, required: true },
  status: { type: String, default: 'pending', enum: ['pending','completed','failed'] },
  paymentMethod: { type: String, enum: ['telebirr','cbe','awash','dashen','abyssinia'] },
  reference: String,
  note: String,
  gameId: String,
  relatedUserId: String,
  balanceAfter: { type: Number, required: true },
}, { timestamps: true });

export default mongoose.model<ITransaction>('Transaction', TransactionSchema);
