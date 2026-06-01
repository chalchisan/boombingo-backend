import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a standard 5x5 Bingo card
 * B: 1-15, I: 16-30, N: 31-45, G: 46-60, O: 61-75
 * Center (row 2, col 2) is FREE = 0
 */
export function generateBingoCard(): number[][] {
  const ranges = [
    { min: 1, max: 15 },   // B
    { min: 16, max: 30 },  // I
    { min: 31, max: 45 },  // N
    { min: 46, max: 60 },  // G
    { min: 61, max: 75 },  // O
  ];

  const card: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0));

  for (let col = 0; col < 5; col++) {
    const { min, max } = ranges[col];
    const nums = getRandomNumbers(min, max, 5);
    for (let row = 0; row < 5; row++) {
      card[row][col] = nums[row];
    }
  }

  // FREE space in center
  card[2][2] = 0;
  return card;
}

function getRandomNumbers(min: number, max: number, count: number): number[] {
  const pool: number[] = [];
  for (let i = min; i <= max; i++) pool.push(i);
  const shuffled = pool.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Generate a unique game code
 */
export function generateGameCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Generate a unique referral code
 */
export function generateReferralCode(): string {
  return uuidv4().substring(0, 8).toUpperCase();
}

/**
 * Generate a unique card ID
 */
export function generateCardId(): string {
  return Math.floor(Math.random() * 900 + 100).toString();
}

/**
 * Get the BINGO column letter for a number
 */
export function getBingoColumn(num: number): string {
  if (num >= 1 && num <= 15) return 'B';
  if (num >= 16 && num <= 30) return 'I';
  if (num >= 31 && num <= 45) return 'N';
  if (num >= 46 && num <= 60) return 'G';
  if (num >= 61 && num <= 75) return 'O';
  return '';
}

/**
 * Check if a bingo card has won given called numbers
 */
export function checkBingoWin(card: number[][], calledNumbers: number[]): boolean {
  const called = new Set(calledNumbers);
  
  const isMarked = (row: number, col: number): boolean => {
    const val = card[row][col];
    return val === 0 || called.has(val); // 0 = FREE
  };

  // Check rows
  for (let row = 0; row < 5; row++) {
    if ([0,1,2,3,4].every(col => isMarked(row, col))) return true;
  }

  // Check columns
  for (let col = 0; col < 5; col++) {
    if ([0,1,2,3,4].every(row => isMarked(row, col))) return true;
  }

  // Check diagonals
  if ([0,1,2,3,4].every(i => isMarked(i, i))) return true;
  if ([0,1,2,3,4].every(i => isMarked(i, 4-i))) return true;

  return false;
}

/**
 * Calculate winning amount based on player count and stake
 */
export function calculateWinningAmount(playerCount: number, stake: number, houseEdge: number = 0.10): number {
  const pool = playerCount * stake;
  return Math.floor(pool * (1 - houseEdge));
}

/**
 * Get the next number to call (not yet called)
 */
export function getNextCall(calledNumbers: number[]): number {
  const allNumbers = Array.from({ length: 75 }, (_, i) => i + 1);
  const uncalled = allNumbers.filter(n => !calledNumbers.includes(n));
  if (uncalled.length === 0) return -1;
  return uncalled[Math.floor(Math.random() * uncalled.length)];
}
