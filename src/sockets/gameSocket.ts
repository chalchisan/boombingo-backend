import { Server, Socket } from 'socket.io';
import Game, { IGame, StakeAmount } from '../models/Game';
import User from '../models/User';
import Transaction from '../models/Transaction';
import Jackpot from '../models/Jackpot';
import {
  generateBingoCard,
  generateGameCode,
  generateCardId,
  checkBingoWin,
  calculateWinningAmount,
  getNextCall,
} from '../utils/bingoUtils';

const gameTimers = new Map<string, NodeJS.Timeout>();
const callTimers = new Map<string, NodeJS.Timeout>();

export function setupGameSocket(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('join_room', async ({ stake, userId, cardCount = 1 }: {
      stake: StakeAmount; userId: string; cardCount: number;
    }) => {
      try {
        const user = await User.findById(userId);
        if (!user) return socket.emit('error', { message: 'User not found' });

        const totalCost = stake * cardCount;
        const availableBalance = user.mainBalance + user.bonusBalance;
        if (availableBalance < totalCost) {
          return socket.emit('error', { message: 'Insufficient balance' });
        }

        let game = await Game.findOne({ stake, status: 'waiting' }).sort({ createdAt: 1 });
        if (!game) {
          game = new Game({ gameCode: generateGameCode(), stake, status: 'waiting', players: [], calledNumbers: [] });
          await game.save();
        }

        const alreadyIn = game.players.some(p => p.userId === userId);
        if (alreadyIn) {
          socket.join(`game:${game._id}`);
          return socket.emit('joined_game', { game: safeGame(game), myCards: game.players.filter(p => p.userId === userId) });
        }

        let remaining = totalCost;
        if (user.bonusBalance >= remaining) { user.bonusBalance -= remaining; }
        else { remaining -= user.bonusBalance; user.bonusBalance = 0; user.mainBalance -= remaining; }
        await user.save();

        for (let i = 0; i < cardCount; i++) {
          game.players.push({ userId, cardId: generateCardId(), card: generateBingoCard(), markedNumbers: [], hasWon: false });
        }
        game.playerCount = new Set(game.players.map(p => p.userId)).size;
        await game.save();

        socket.join(`game:${game._id}`);
        socket.emit('joined_game', { game: safeGame(game), myCards: game.players.filter(p => p.userId === userId) });
        io.to(`game:${game._id}`).emit('player_joined', { playerCount: game.playerCount });

        if (game.playerCount >= 2 && game.status === 'waiting') {
          await startCountdown(io, game._id.toString());
        } else if (game.status === 'waiting' && !gameTimers.has(game._id.toString())) {
          const timer = setTimeout(() => startCountdown(io, game._id.toString()), 30000);
          gameTimers.set(game._id.toString(), timer);
        }
      } catch (err) {
        console.error('join_room error:', err);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    socket.on('claim_bingo', async ({ gameId, userId, cardId }: { gameId: string; userId: string; cardId: string; }) => {
      try {
        const game = await Game.findById(gameId);
        if (!game || game.status !== 'started') return;

        const playerCard = game.players.find(p => p.userId === userId && p.cardId === cardId);
        if (!playerCard || playerCard.hasWon) return;

        const isWinner = checkBingoWin(playerCard.card, game.calledNumbers);
        if (!isWinner) return socket.emit('invalid_bingo', { message: 'Not a valid bingo yet!' });

        playerCard.hasWon = true;
        game.status = 'finished';
        game.winnerId = userId;
        game.winnerCardId = cardId;
        game.endTime = new Date();
        game.winningAmount = calculateWinningAmount(game.playerCount, game.stake);
        await game.save();

        const ct = callTimers.get(gameId);
        if (ct) { clearInterval(ct); callTimers.delete(gameId); }

        const winner = await User.findById(userId);
        if (winner) {
          winner.mainBalance += game.winningAmount;
          winner.totalWins += 1;
          winner.totalGamesPlayed += 1;
          await winner.save();
          await Transaction.create({ userId, type: 'win', amount: game.winningAmount, status: 'completed', gameId, balanceAfter: winner.mainBalance });
        }

        const jackpot = await Jackpot.findOne({ stake: game.stake });
        if (jackpot) {
          jackpot.amount = Math.min(jackpot.amount + Math.floor(game.stake * game.playerCount * 0.02), jackpot.maxAmount);
          await jackpot.save();
        }

        io.to(`game:${gameId}`).emit('game_won', {
          winnerId: userId, winnerCardId: cardId, winningAmount: game.winningAmount,
          winnerName: winner?.username || 'Unknown', card: playerCard.card, calledNumbers: game.calledNumbers,
        });
      } catch (err) { console.error('claim_bingo error:', err); }
    });

    socket.on('disconnect', () => console.log(`Socket disconnected: ${socket.id}`));
  });
}

async function startCountdown(io: Server, gameId: string) {
  const game = await Game.findById(gameId);
  if (!game || game.status !== 'waiting') return;
  const existing = gameTimers.get(gameId);
  if (existing) { clearTimeout(existing); gameTimers.delete(gameId); }
  game.status = 'countdown';
  await game.save();
  io.to(`game:${gameId}`).emit('countdown_started', { seconds: 10 });
  let countdown = 10;
  const countInterval = setInterval(async () => {
    countdown--;
    io.to(`game:${gameId}`).emit('countdown_tick', { seconds: countdown });
    if (countdown <= 0) { clearInterval(countInterval); await startGame(io, gameId); }
  }, 1000);
}

async function startGame(io: Server, gameId: string) {
  const game = await Game.findById(gameId);
  if (!game) return;
  game.status = 'started';
  game.startTime = new Date();
  await game.save();
  io.to(`game:${gameId}`).emit('game_started', { gameCode: game.gameCode });
  const callInterval = setInterval(async () => {
    const updatedGame = await Game.findById(gameId);
    if (!updatedGame || updatedGame.status !== 'started') { clearInterval(callInterval); callTimers.delete(gameId); return; }
    const nextNum = getNextCall(updatedGame.calledNumbers);
    if (nextNum === -1) { clearInterval(callInterval); callTimers.delete(gameId); return; }
    updatedGame.calledNumbers.push(nextNum);
    updatedGame.currentCall = nextNum;
    await updatedGame.save();
    io.to(`game:${gameId}`).emit('number_called', { number: nextNum, calledNumbers: updatedGame.calledNumbers, callCount: updatedGame.calledNumbers.length });
  }, 3000);
  callTimers.set(gameId, callInterval);
}

function safeGame(game: IGame) {
  return { id: game._id, gameCode: game.gameCode, stake: game.stake, status: game.status, playerCount: game.playerCount, calledNumbers: game.calledNumbers, currentCall: game.currentCall, winningAmount: game.winningAmount };
}
