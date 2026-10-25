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

  // ── Every 6 hours: Supabase keep-alive to prevent project auto-pause ──
  cron.schedule('0 */6 * * *', async () => {
    await runSupabaseKeepAlive();
  });

  // Run initial keepalive ping on startup (after 5s delay)
  setTimeout(() => {
    runSupabaseKeepAlive();
  }, 5000);

  logger.info('⏰ Scheduler started (feeding + heartbeat watchdog + Supabase keep-alive)');
}

/**
 * Keeps the Supabase database and REST API active to prevent auto-pause on free tier.
 */
export async function runSupabaseKeepAlive(): Promise<void> {
  // 1. Direct PostgreSQL query (SELECT 1)
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info('🗄️ Supabase DB keep-alive query successful (SELECT 1)');
  } catch (err: any) {
    if (err?.message?.includes('not found') || err?.message?.includes('ENOTFOUND')) {
      logger.error('🚨 SUPABASE PAUSED ALERT: Supabase project is paused or tenant not found! Please unpause it at https://supabase.com/dashboard');
    } else {
      logger.error('🗄️ Supabase DB keep-alive query failed:', err?.message || err);
    }
  }

  // 2. HTTPS ping to Supabase REST endpoint
  try {
    const match = env.databaseUrl.match(/postgres\.([a-zA-Z0-9_-]+):/);
    const projectRef = match ? match[1] : null;
    if (projectRef) {
      const supabaseUrl = `https://${projectRef}.supabase.co`;
      https.get(supabaseUrl, (res) => {
        logger.info(`🗄️ Supabase HTTP ping to ${supabaseUrl} returned HTTP ${res.statusCode}`);
      }).on('error', (err) => {
        logger.warn('🗄️ Supabase HTTP ping notice:', err.message);
      });
    }
  } catch (err: any) {
    logger.warn('🗄️ Supabase HTTP keepalive parse error:', err?.message || err);
  }
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
