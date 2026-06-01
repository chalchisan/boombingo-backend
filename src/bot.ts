/**
 * BoomBingo Telegram Bot
 * Run separately: ts-node src/bot.ts
 */
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const WEBAPP_URL = process.env.FRONTEND_URL || 'https://your-boombingo-app.com';
const API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function sendMessage(chatId: number, text: string, replyMarkup?: object) {
  await axios.post(`${API_URL}/sendMessage`, {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    reply_markup: replyMarkup,
  });
}

async function setWebhook(url: string) {
  const res = await axios.post(`${API_URL}/setWebhook`, { url });
  console.log('Webhook set:', res.data);
}

async function handleUpdate(update: any) {
  const msg = update.message;
  if (!msg) return;

  const chatId = msg.chat.id;
  const text = msg.text || '';
  const user = msg.from;

  if (text.startsWith('/start')) {
    const referral = text.split(' ')[1] || '';
    await sendMessage(chatId,
      `🎉 <b>BoomBingo (ቡምቢንጎ) へ እንኳን ደህና መጡ!</b>\n\n` +
      `ምርጡ የቢንጎ ጨዋታ — ተጫወቱ፣ አሸንፉ!\n\n` +
      `✅ ፈጣን ጨዋታ\n✅ ቴሌብር ክፍያ\n✅ ትልቅ ሽልማት`,
      {
        inline_keyboard: [[{
          text: '🎮 BoomBingo ጫወት!',
          web_app: { url: referral ? `${WEBAPP_URL}?ref=${referral}` : WEBAPP_URL }
        }]]
      }
    );
  } else if (text === '/play') {
    await sendMessage(chatId, '🎯 ጨዋታ ለመጀመር ቁልፉን ጫን:', {
      inline_keyboard: [[{ text: '🚀 ጨዋታ ጀምር', web_app: { url: WEBAPP_URL } }]]
    });
  } else if (text === '/help') {
    await sendMessage(chatId,
      `📖 <b>BoomBingo እርዳታ</b>\n\n` +
      `/start — ጨዋታ ጀምር\n/play — ቀጥታ ጨዋታ\n/help — እርዳታ\n\n` +
      `❓ ሌሎች ጥያቄዎች ካሉ ወደ ድጋፍ ቡድናችን ይጻፉ።`
    );
  }
}

// Export for use in Express webhook
export { handleUpdate, setWebhook };
