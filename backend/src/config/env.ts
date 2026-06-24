// SmartCat Feeder - Environment Configuration
// Loads and validates all environment variables at startup.

import dotenv from 'dotenv';
dotenv.config();

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const env = {
  // Server
  port: parseInt(optional('BACKEND_PORT', '5000'), 10),
  nodeEnv: optional('NODE_ENV', 'development'),
  frontendUrl: optional('FRONTEND_URL', 'http://localhost:5173'),
  publicUrl: optional('PUBLIC_URL', optional('RENDER_EXTERNAL_URL', '')),

  // Database
  databaseUrl: required('DATABASE_URL'),

  // JWT
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: optional('JWT_EXPIRES_IN', '7d'),

  // MQTT
  mqtt: {
    host: required('MQTT_BROKER_HOST'),
    port: parseInt(optional('MQTT_BROKER_PORT', '8883'), 10),
    username: optional('MQTT_USERNAME', ''),
    password: optional('MQTT_PASSWORD', ''),
    clientId: optional('MQTT_CLIENT_ID', 'smartcat-backend'),
    namespace: optional('MQTT_TOPIC_NAMESPACE', 'geo123'),
  },

  // Telegram
  telegram: {
    botToken: optional('TELEGRAM_BOT_TOKEN', ''),
    allowedChatIds: optional('TELEGRAM_ALLOWED_CHAT_IDS', '').split(',').filter(Boolean),
    adminTelegramChatId: optional('ADMIN_TELEGRAM_CHAT_ID', ''),
  },

  // Safety
  feedCooldownSeconds: parseInt(optional('FEED_COOLDOWN_SECONDS', '60'), 10),
  maxFeedsPerDay: parseInt(optional('MAX_FEEDS_PER_DAY', '10'), 10),
} as const;
