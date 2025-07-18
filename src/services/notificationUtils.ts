// src/services/notificationUtils.ts

import { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } from '../config/constants';

export async function sendMessageToTelegram(message: string) {
  try {
    console.log('[DEBUG] Sending Telegram notification via Netlify function: ' + message);
    const response = await fetch('/.netlify/functions/telegramNotify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    const data = await response.json();
    if (!response.ok) {
      console.log('[ERROR] Netlify function error: ', data);
      throw new Error(data.error || 'Failed to send message');
    }
    console.log('[DEBUG] Telegram notification sent: ', data);
  } catch (error: any) {
    console.log('[ERROR] Telegram notification failed: ', error.message);
  }
} 