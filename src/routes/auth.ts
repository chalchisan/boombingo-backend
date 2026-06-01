import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { generateReferralCode } from '../utils/bingoUtils';
import Jackpot from '../models/Jackpot';

const router = Router();

// Register / Login via Telegram
router.post('/telegram', async (req: Request, res: Response): Promise<void> => {
  try {
    const { telegramId, username, firstName, lastName, photoUrl, phone, referralCode } = req.body;

    if (!telegramId || !phone) {
      res.status(400).json({ error: 'telegramId and phone required' });
      return;
    }

    let user = await User.findOne({ telegramId });

    if (!user) {
      // Create new user
      const myReferralCode = generateReferralCode();
      let referredBy: string | undefined;

      if (referralCode) {
        const referrer = await User.findOne({ referralCode });
        if (referrer) {
          referredBy = referrer.telegramId;
          // Give referral bonus to referrer
          referrer.bonusBalance += 20;
          referrer.referralCount += 1;
          await referrer.save();
        }
      }

      user = new User({
        telegramId,
        username: username || firstName,
        phone,
        firstName,
        lastName,
        photoUrl,
        referralCode: myReferralCode,
        referredBy,
        bonusBalance: referredBy ? 10 : 0, // New user bonus if referred
      });
      await user.save();

      // Ensure jackpots exist
      await initJackpots();
    } else {
      // Update existing user info
      user.username = username || user.username;
      user.firstName = firstName || user.firstName;
      user.photoUrl = photoUrl || user.photoUrl;
      await user.save();
    }

    const token = jwt.sign(
      { userId: user._id.toString(), telegramId: user.telegramId },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        phone: user.phone,
        photoUrl: user.photoUrl,
        mainBalance: user.mainBalance,
        bonusBalance: user.bonusBalance,
        coins: user.coins,
        totalWins: user.totalWins,
        totalGamesPlayed: user.totalGamesPlayed,
        referralCode: user.referralCode,
      }
    });
  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Daily login bonus
router.post('/daily-bonus', async (req: Request, res: Response): Promise<void> => {
  try {
    const { telegramId } = req.body;
    const user = await User.findOne({ telegramId });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    const now = new Date();
    const lastBonus = user.lastLoginBonus;
    
    if (lastBonus) {
      const hoursSince = (now.getTime() - lastBonus.getTime()) / (1000 * 60 * 60);
      if (hoursSince < 24) {
        const hoursLeft = Math.ceil(24 - hoursSince);
        res.json({ claimed: false, hoursLeft });
        return;
      }
    }

    user.bonusBalance += 5;
    user.lastLoginBonus = now;
    await user.save();

    res.json({ claimed: true, bonus: 5, newBonusBalance: user.bonusBalance });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

async function initJackpots() {
  const stakes = [10, 20, 50, 100];
  for (const stake of stakes) {
    await Jackpot.findOneAndUpdate(
      { stake },
      { $setOnInsert: { stake, amount: 0, maxAmount: 1000 } },
      { upsert: true, new: true }
    );
  }
}

export default router;
