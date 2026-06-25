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

  // ── 1. Clean up stale PENDING feeds in the DB ─────────────────────────────
  const staleThreshold = new Date(Date.now() - 60_000);
  await prisma.feedLog.updateMany({
    where: { status: 'PENDING', createdAt: { lt: staleThreshold } },
    data: { status: 'FAILED', message: 'Timed out — no response from device', completedAt: new Date() },
  });

  // ── 2. Check daily feed limit ──────────────────────────────────────────────
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const device = await prisma.deviceStatus.findUnique({ where: { id: 'device-1' } });
  const maxFeeds = device?.maxFeedsPerDay ?? env.maxFeedsPerDay;

  const todayFeedCount = await prisma.feedLog.count({
    where: { createdAt: { gte: todayStart }, status: 'SUCCESS' },
  });

  if (todayFeedCount >= maxFeeds) {
    logger.warn(`Feed rejected: daily limit of ${maxFeeds} reached (${todayFeedCount} today)`);
    return {
      success: false,
      message: `Daily feed limit of ${maxFeeds} reached. Try again tomorrow.`,
      requestId,
    };
  }

  // ── 3. Check cooldown ──────────────────────────────────────────────────────
  const lastSuccessfulFeed = await prisma.feedLog.findFirst({
    where: { status: 'SUCCESS' },
    orderBy: { completedAt: 'desc' },
  });

  if (lastSuccessfulFeed?.completedAt) {
    const elapsedSeconds = (Date.now() - lastSuccessfulFeed.completedAt.getTime()) / 1000;
    if (elapsedSeconds < env.feedCooldownSeconds) {
      const waitSeconds = Math.ceil(env.feedCooldownSeconds - elapsedSeconds);
      logger.warn(`Feed rejected: cooldown active, ${waitSeconds}s remaining`);
      return {
        success: false,
        message: `Feeder is cooling down. Please wait ${waitSeconds} seconds.`,
        requestId,
      };
    }
  }

  // ── 4. Create PENDING feed log ─────────────────────────────────────────────
  const feedLog = await prisma.feedLog.create({
    data: {
      source,
      status: 'PENDING',
      portion,
      userId,
      userName,
      requestId,
      message: 'Feed command sent to device',
    },
  });

  // ── 5. Publish MQTT command and wait for response ──────────────────────────
  try {
    const response = await publishFeedCommandAndWait({
      requestId,
      source,
      userId: userId || 'system',
      userName,
      portion,
    });

    return {
      success: response.status === 'success',
      message: response.message,
      requestId,
      feedLogId: feedLog.id,
    };
  } catch (err) {
    // Timeout or publish error — mark log as FAILED
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';

    await prisma.feedLog.update({
      where: { id: feedLog.id },
      data: { status: 'FAILED', message: errorMessage, completedAt: new Date() },
    });

    return {
      success: false,
      message: errorMessage,
      requestId,
      feedLogId: feedLog.id,
    };
  }
}
