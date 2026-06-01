import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import User from '../models/User';
import Transaction from '../models/Transaction';

const router = Router();
router.use(authenticate);

// Get wallet info
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.userId);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json({
      mainBalance: user.mainBalance,
      bonusBalance: user.bonusBalance,
      coins: user.coins,
    });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// Get transaction history
router.get('/transactions', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type, limit = 20, skip = 0 } = req.query;
    const filter: Record<string, unknown> = { userId: req.userId };
    if (type && type !== 'all') filter.type = type;

    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip(Number(skip));

    const total = await Transaction.countDocuments(filter);
    res.json({ transactions, total });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// Initiate deposit (mock - in production integrate with Telebirr API)
router.post('/deposit', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { amount, paymentMethod } = req.body;
    if (!amount || amount <= 0) { res.status(400).json({ error: 'Invalid amount' }); return; }

    const user = await User.findById(req.userId);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    // In production: call payment gateway API here
    // For now, simulate successful deposit
    user.mainBalance += Number(amount);
    await user.save();

    const tx = new Transaction({
      userId: req.userId,
      type: 'deposit',
      amount: Number(amount),
      status: 'completed',
      paymentMethod,
      balanceAfter: user.mainBalance,
    });
    await tx.save();

    res.json({ success: true, newBalance: user.mainBalance, transaction: tx });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// Withdraw
router.post('/withdraw', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { amount, paymentMethod, accountName, accountNumber } = req.body;
    if (!amount || amount <= 0) { res.status(400).json({ error: 'Invalid amount' }); return; }

    const user = await User.findById(req.userId);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    if (user.mainBalance < amount) { res.status(400).json({ error: 'Insufficient balance' }); return; }
    if (!accountName || !accountNumber) { res.status(400).json({ error: 'Account details required' }); return; }

    user.mainBalance -= Number(amount);
    await user.save();

    const tx = new Transaction({
      userId: req.userId,
      type: 'withdraw',
      amount: Number(amount),
      status: 'pending', // pending manual review in production
      paymentMethod,
      note: `${accountName} - ${accountNumber}`,
      balanceAfter: user.mainBalance,
    });
    await tx.save();

    res.json({ success: true, newBalance: user.mainBalance, transaction: tx });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// Transfer to friend
router.post('/transfer', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { amount, recipientPhone } = req.body;
    if (!amount || amount <= 0) { res.status(400).json({ error: 'Invalid amount' }); return; }

    const sender = await User.findById(req.userId);
    if (!sender) { res.status(404).json({ error: 'User not found' }); return; }
    if (sender.mainBalance < amount) { res.status(400).json({ error: 'Insufficient balance' }); return; }

    const recipient = await User.findOne({ phone: recipientPhone });
    if (!recipient) { res.status(404).json({ error: 'Recipient not found' }); return; }
    if (recipient._id.toString() === req.userId) { res.status(400).json({ error: 'Cannot transfer to self' }); return; }

    sender.mainBalance -= Number(amount);
    recipient.mainBalance += Number(amount);

    await sender.save();
    await recipient.save();

    await Transaction.insertMany([
      {
        userId: req.userId,
        type: 'transfer_out',
        amount: Number(amount),
        status: 'completed',
        relatedUserId: recipient._id.toString(),
        note: `Transfer to ${recipient.username}`,
        balanceAfter: sender.mainBalance,
      },
      {
        userId: recipient._id.toString(),
        type: 'transfer_in',
        amount: Number(amount),
        status: 'completed',
        relatedUserId: req.userId,
        note: `Transfer from ${sender.username}`,
        balanceAfter: recipient.mainBalance,
      },
    ]);

    res.json({ success: true, newBalance: sender.mainBalance });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

export default router;
