import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import Game from '../models/Game';
import Jackpot from '../models/Jackpot';
import User from '../models/User';

const router = Router();
router.use(authenticate);

// Get available game rooms
router.get('/rooms', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const stakes = [10, 20, 50, 100];
    const rooms = [];

    for (const stake of stakes) {
      const activeGame = await Game.findOne({ stake, status: { $in: ['waiting', 'countdown', 'started'] } })
        .sort({ createdAt: -1 });
      const jackpot = await Jackpot.findOne({ stake });
      
      rooms.push({
        stake,
        playerCount: activeGame?.playerCount || 0,
        status: activeGame?.status || 'waiting',
        gameCode: activeGame?.gameCode,
        jackpot: jackpot?.amount || 0,
        jackpotMax: jackpot?.maxAmount || 1000,
      });
    }

    res.json({ rooms });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// Get game history
router.get('/history', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { mine, limit = 20 } = req.query;
    let query: Record<string, unknown> = { status: 'finished' };
    
    if (mine === 'true') {
      query = { ...query, 'players.userId': req.userId };
    }

    const games = await Game.find(query)
      .sort({ endTime: -1 })
      .limit(Number(limit))
      .select('gameCode stake playerCount calledNumbers winnerId winningAmount startTime endTime');

    res.json({ games });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// Get leaderboard
router.get('/leaderboard', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { period = 'all', limit = 20 } = req.query;
    
    let dateFilter: Date | undefined;
    const now = new Date();
    if (period === '24h') dateFilter = new Date(now.getTime() - 24*60*60*1000);
    else if (period === '7d') dateFilter = new Date(now.getTime() - 7*24*60*60*1000);
    else if (period === '30d') dateFilter = new Date(now.getTime() - 30*24*60*60*1000);

    const matchFilter: Record<string, unknown> = {};
    if (dateFilter) matchFilter.createdAt = { $gte: dateFilter };

    const topUsers = await User.find(matchFilter)
      .sort({ totalWins: -1 })
      .limit(Number(limit))
      .select('username firstName phone totalWins totalGamesPlayed');

    res.json({ leaderboard: topUsers });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

export default router;
