import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import authRoutes from './routes/auth';
import walletRoutes from './routes/wallet';
import gameRoutes from './routes/game';
import userRoutes from './routes/user';
import { setupGameSocket } from './sockets/gameSocket';

// Telegram bot imports
import axios from 'axios';
import { handleUpdate } from './bot';

dotenv.config();

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/user', userRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'OK', service: 'BoomBingo API' });
});

// Socket.io game logic
setupGameSocket(io);

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/boombingo';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    const PORT = process.env.PORT || 3001;
    httpServer.listen(PORT, () => {
      console.log(`🚀 BoomBingo server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// Telegram bot polling
async function startPolling() {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!BOT_TOKEN || BOT_TOKEN === 'fake_token_for_now') {
    console.log('⚠️ Telegram bot token not set – polling disabled');
    return;
  }
  let offset = 0;
  console.log('🤖 Telegram bot polling started');
  setInterval(async () => {
    try {
      const url = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${offset}&timeout=30`;
      const response = await axios.get(url);
      const updates = response.data.result;
      for (const update of updates) {
        await handleUpdate(update);
        offset = update.update_id + 1;
      }
    } catch (err) {
      // ignore network errors
    }
  }, 1500);
}

startPolling();

export { io };