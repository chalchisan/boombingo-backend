import mongoose, { Document, Schema } from 'mongoose';

export type GameStatus = 'waiting' | 'countdown' | 'started' | 'finished';
export type StakeAmount = 10 | 20 | 50 | 100;

export interface IPlayerCard {
  userId: string;
  cardId: string;
  card: number[][];
  markedNumbers: number[];
  hasWon: boolean;
}

export interface IGame extends Document {
  gameCode: string;
  stake: StakeAmount;
  status: GameStatus;
  players: IPlayerCard[];
  playerCount: number;
  calledNumbers: number[];
  currentCall?: number;
  winnerId?: string;
  winnerCardId?: string;
  winningAmount: number;
  jackpotContribution: number;
  startTime?: Date;
  endTime?: Date;
  createdAt: Date;
}

const PlayerCardSchema = new Schema<IPlayerCard>({
  userId: { type: String, required: true },
  cardId: { type: String, required: true },
  card: [[Number]],
  markedNumbers: [Number],
  hasWon: { type: Boolean, default: false },
});

const GameSchema = new Schema<IGame>({
  gameCode: { type: String, required: true, unique: true, index: true },
  stake: { type: Number, required: true, enum: [10, 20, 50, 100] },
  status: { type: String, default: 'waiting', enum: ['waiting', 'countdown', 'started', 'finished'] },
  players: [PlayerCardSchema],
  playerCount: { type: Number, default: 0 },
  calledNumbers: [Number],
  currentCall: Number,
  winnerId: String,
  winnerCardId: String,
  winningAmount: { type: Number, default: 0 },
  jackpotContribution: { type: Number, default: 0 },
  startTime: Date,
  endTime: Date,
}, { timestamps: true });

export default mongoose.model<IGame>('Game', GameSchema);
