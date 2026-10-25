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

  // MQTT - Automatically route to working dedicated cluster if broker.hivemq.com is configured
  mqtt: {
    host: (() => {
      const h = process.env.MQTT_BROKER_HOST || process.env.MQTT_BROKER_URL || '';
      if (!h || h === 'broker.hivemq.com' || h.includes('broker.emqx.io')) {
        return '1929ae9bc33d4ba29b4aa4f909c3ef85.s1.eu.hivemq.cloud';
      }
      return h;
    })(),
    port: parseInt(
      process.env.MQTT_BROKER_PORT ||
      ((process.env.MQTT_BROKER_HOST?.includes('hivemq.cloud') || !process.env.MQTT_BROKER_HOST) ? '8883' : '8883'),
      10
    ),
    username: process.env.MQTT_USERNAME || 'geo123',
    password: process.env.MQTT_PASSWORD || 'GeoCatFeeder2026',
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
