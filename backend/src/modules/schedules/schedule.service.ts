// SmartCat Feeder - Schedule Service (Cron)
// Runs every minute to check if any feeding schedule should fire.

import cron from 'node-cron';
import { prisma } from '../../config/prisma';
import { triggerFeed } from '../feeds/feed.service';
import { checkDeviceHeartbeatTimeout } from '../mqtt/mqtt.service';
import { logger } from '../../utils/logger';

import http from 'http';
import https from 'https';
import { env } from '../../config/env';

/**
 * Start the scheduler. Called once when the backend boots.
 */
export function startScheduler(): void {
  // ── Every minute: check feeding schedules ──
  cron.schedule('* * * * *', async () => {
    await runScheduledFeeds();
  });

  // ── Every 30 seconds: check device heartbeat timeout ──
  cron.schedule('*/30 * * * * *', async () => {
    await checkDeviceHeartbeatTimeout();
  });

  // ── Every 10 minutes: keep-alive self-ping to prevent Render spin-down ──
  if (env.publicUrl) {
    const healthUrl = `${env.publicUrl.replace(/\/$/, '')}/api/health`;
    logger.info(`🌐 Keep-alive self-ping configured for: ${healthUrl}`);
    cron.schedule('*/10 * * * *', () => {
      logger.debug(`🌐 Sending keep-alive self-ping to ${healthUrl}...`);
      try {
        const client = healthUrl.startsWith('https') ? https : http;
        client.get(healthUrl, (res) => {
          logger.debug(`🌐 Keep-alive response status: ${res.statusCode}`);
        }).on('error', (err) => {
          logger.error('🌐 Keep-alive self-ping request error:', err);
        });
      } catch (err) {
        logger.error('🌐 Keep-alive self-ping execution error:', err);
      }
    });
  } else {
    logger.warn('🌐 Keep-alive self-ping is disabled (PUBLIC_URL / RENDER_EXTERNAL_URL is not set)');
  }

  logger.info('⏰ Scheduler started (feeding + heartbeat watchdog)');
}

/**
 * Checks the current time against all enabled schedules and triggers feeds.
 */
async function runScheduledFeeds(): Promise<void> {
  const now = new Date();
  const currentHour = now.getHours().toString().padStart(2, '0');
  const currentMinute = now.getMinutes().toString().padStart(2, '0');
  const currentTimeStr = `${currentHour}:${currentMinute}`;
  const currentDay = now.getDay(); // 0=Sun, 1=Mon, ...6=Sat

  try {
    const schedules = await prisma.schedule.findMany({
      where: { enabled: true, time: currentTimeStr },
    });

    for (const schedule of schedules) {
      const allowedDays = schedule.daysOfWeek.split(',').map(Number);

      if (!allowedDays.includes(currentDay)) {
        continue; // Not scheduled for today
      }

      logger.info(`⏰ Running scheduled feed: "${schedule.name}" at ${currentTimeStr}`);

      try {
        const result = await triggerFeed({
          source: 'SCHEDULE',
          userName: `Schedule: ${schedule.name}`,
          portion: schedule.portion,
        });

        logger.info(
          `Schedule "${schedule.name}" result: ${result.success ? 'success' : 'failed'} - ${result.message}`
        );
      } catch (err) {
        logger.error(`Schedule "${schedule.name}" failed:`, err);
      }
    }
  } catch (err) {
    logger.error('Scheduler error while fetching schedules:', err);
  }
}
