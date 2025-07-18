// src/services/notificationUtils.ts

import { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } from '../config/constants';

export async function sendMessageToTelegram(message: string) {
  try {
    const response = await fetch('/.netlify/functions/telegramNotify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to send message');
    }
  } catch (error: any) {
    console.log('[ERROR] Telegram notification failed: ', error.message);
  }
} 