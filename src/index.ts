// backend/src/index.ts
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// --- Import Routes and Modules ---
import authRoutes from './routes/auth';
import walletRoutes from './routes/wallet';
import gameRoutes from './routes/game';
import userRoutes from './routes/user';
import { setupGameSocket } from './sockets/gameSocket';
import { handleUpdate } from './bot'; // Your bot's message handler

// --- App Initialization ---
dotenv.config();
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { /* ... CORS config ... */ });

// --- Middlewares ---
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

// --- ✅ THE CRITICAL WEBHOOK ROUTE ✅ ---
// This line creates the endpoint that Telegram will call.
app.post('/webhook', async (req, res) => {
  console.log('📨 Webhook received'); // You will see this log in Railway!
  try {
    await handleUpdate(req.body); // Process the message from Telegram
    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook error:', err);
    res.sendStatus(500);
  }
});
// --------------------------------------

// --- API Routes & Server Start (unchanged) ---
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/user', userRoutes);

app.get('/health', (_req, res) => res.json({ status: 'OK', service: 'BoomBingo API' }));

setupGameSocket(io);

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/boombingo';
mongoose.connect(MONGODB_URI).then(() => {
    console.log('✅ MongoDB connected');
    const PORT = process.env.PORT || 3001;
    httpServer.listen(PORT, () => console.log(`🚀 BoomBingo server running on port ${PORT}`));
}).catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
});

export { io };