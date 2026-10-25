// SmartCat Feeder - Feed Service
// Core business logic for dispensing food. Used by web API, Telegram bot, and scheduler.

import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import {
  publishFeedCommandAndWait,
  getIsDispensing,
  getMqttConnectionStatus,
  releaseDispensingLock,
} from '../mqtt/mqtt.service';
import { isLockStale, clearLockTimestamp } from '../../utils/dispensingLock';
import { generateRequestId } from '../../utils/requestId';
import { logger } from '../../utils/logger';

import { 
  getDeviceStatusRecord, 
  getFeedCooldownSeconds, 
  getCooldownRemainingSeconds, 
  recordFeedCompleted 
} from '../device/device.service';

export type FeedSource = 'WEB' | 'TELEGRAM' | 'SCHEDULE';

export interface FeedRequest {
  source: FeedSource;
  userId?: string;
  userName: string;
  portion?: number;
}

export interface FeedResult {
  success: boolean;
  message: string;
  requestId: string;
  feedLogId?: string;
}

/**
 * Core feed function. Checks safety limits, publishes MQTT command, waits for response, and logs result.
 */
export async function triggerFeed(req: FeedRequest): Promise<FeedResult> {
  const { source, userId, userName, portion = 1 } = req;
  const requestId = generateRequestId();

  // ── 0a. Auto-expire a stale lock ──────────────────────────────────────────
  // If the lock has been held for more than 30s (the LOCK_MAX_AGE_MS threshold),
  // it means the timeout in publishFeedCommandAndWait failed to release it.
  // This is the last-resort safety valve.
  if (isLockStale()) {
    logger.warn('Stale dispensing lock detected — force-releasing before new request.');
    releaseDispensingLock();
    clearLockTimestamp();
  }

  // ── 0b. Check MQTT connectivity BEFORE trying anything ───────────────────
  // If MQTT isn't connected, no command can ever reach the Arduino.
  // Fail fast with a clear user-facing message instead of holding the lock for 20s.
  if (!getMqttConnectionStatus()) {
    logger.warn('Feed rejected: MQTT broker not connected');
    return {
      success: false,
      message: 'Cannot reach the feeder — MQTT broker is not connected. Please wait a moment.',
      requestId,
    };
  }

  // ── 0c. Simultaneous feed guard ────────────────────────────────────────────
  if (getIsDispensing()) {
    logger.warn('Feed rejected: device is already dispensing');
    return {
      success: false,
      message: 'The feeder is currently dispensing. Please wait a moment before trying again.',
      requestId,
    };
  }

  // ── 1. Clean up stale PENDING feeds asynchronously (non-blocking) ─────────
  const staleThreshold = new Date(Date.now() - 60_000);
  prisma.feedLog.updateMany({
    where: { status: 'PENDING', createdAt: { lt: staleThreshold } },
    data: { status: 'FAILED', message: 'Timed out — no response from device', completedAt: new Date() },
  }).catch((err) => logger.warn(`Background stale feed cleanup notice: ${err}`));

  // ── 2. Check Cooldown Instantly (in-memory, 0ms latency) ──────────────────
  const cooldownRemaining = getCooldownRemainingSeconds();
  if (cooldownRemaining > 0) {
    logger.warn(`Feed rejected: cooldown active, ${cooldownRemaining}s remaining`);
    return {
      success: false,
      message: `Feeder is cooling down. Please wait ${cooldownRemaining} seconds.`,
      requestId,
    };
  }

  // ── 3. Check daily feed limit in parallel with device settings ─────────────
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [device, todayFeedCount] = await Promise.all([
    getDeviceStatusRecord(),
    prisma.feedLog.count({
      where: { createdAt: { gte: todayStart }, status: 'SUCCESS' },
    }),
  ]);

  const maxFeeds = device?.maxFeedsPerDay ?? env.maxFeedsPerDay;
  if (todayFeedCount >= maxFeeds) {
    logger.warn(`Feed rejected: daily limit of ${maxFeeds} reached (${todayFeedCount} today)`);
    return {
      success: false,
      message: `Daily feed limit of ${maxFeeds} reached. Try again tomorrow.`,
      requestId,
    };
  }

  // ── 4. Create PENDING feed log asynchronously (non-blocking for sub-second speed)
  const feedLogPromise = prisma.feedLog.create({
    data: {
      source,
      status: 'PENDING',
      portion,
      userId,
      userName,
      requestId,
      message: 'Feed command sent to device',
    },
  }).catch((err) => {
    logger.warn(`FeedLog insert notice: ${err}`);
    return null;
  });

  // ── 5. Publish MQTT command and wait for real-time ACK ────────────────────
  try {
    const response = await publishFeedCommandAndWait({
      requestId,
      source,
      userId: userId || 'system',
      userName,
      portion,
    });

    releaseDispensingLock();

    if (response.status === 'success') {
      recordFeedCompleted(new Date());
    }

    // Update log in background
    feedLogPromise.then((feedLog) => {
      if (feedLog) {
        prisma.feedLog.update({
          where: { id: feedLog.id },
          data: { status: 'SUCCESS', message: response.message, completedAt: new Date() },
        }).catch(() => {});
      }
    });

    return {
      success: response.status === 'success',
      message: response.message,
      requestId,
    };
  } catch (err) {
    releaseDispensingLock();
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';

    feedLogPromise.then((feedLog) => {
      if (feedLog) {
        prisma.feedLog.update({
          where: { id: feedLog.id },
          data: { status: 'FAILED', message: errorMessage, completedAt: new Date() },
        }).catch(() => {});
      }
    });

    return {
      success: false,
      message: errorMessage,
      requestId,
    };
  }
}
