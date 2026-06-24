// SmartCat Feeder - Backend Entry Point
// Boots the server, connects to MQTT broker, starts scheduler, and launches Telegram bot.

import dns from 'dns';
import app from './app';
import { env } from './config/env';
import { connectMqtt } from './modules/mqtt/mqtt.service';
import { startScheduler } from './modules/schedules/schedule.service';
import { startTelegramBot } from './modules/telegram/telegram.service';
import { logger } from './utils/logger';

async function main(): Promise<void> {
  // Prioritize IPv4 resolution to prevent DNS-related delays or timeouts when contacting external APIs like Telegram on certain ISPs.
  dns.setDefaultResultOrder('ipv4first');
  logger.info('🐱 SmartCat Feeder Backend starting...');

  // Connect to MQTT broker
  connectMqtt();

  // Start cron scheduler for scheduled feeds + heartbeat watchdog
  startScheduler();

  // Start Telegram bot (long polling)
  startTelegramBot();

  // Start Express HTTP server
  const server = app.listen(env.port, () => {
    logger.info(`🚀 Server running on http://localhost:${env.port}`);
    logger.info(`📡 MQTT broker: ${env.mqtt.host}:${env.mqtt.port}`);
    logger.info(`🌍 CORS allowed origin: ${env.frontendUrl}`);
    logger.info(`Environment: ${env.nodeEnv}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
      logger.info('Server closed.');
      process.exit(0);
    });
  });
}

main().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});
