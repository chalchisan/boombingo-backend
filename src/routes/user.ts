import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import User from '../models/User';

const router = Router();
router.use(authenticate);

// Get user profile
router.get('/profile', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.userId).select('-__v');
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json({ user });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// Update username
router.put('/username', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { username } = req.body;
    if (!username || username.length < 2) { res.status(400).json({ error: 'Invalid username' }); return; }
    
    const user = await User.findByIdAndUpdate(req.userId, { username }, { new: true });
    res.json({ success: true, username: user?.username });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

export default router;
