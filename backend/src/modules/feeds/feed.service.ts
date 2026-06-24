// SmartCat Feeder - Feed Service
// Core business logic for dispensing food. Used by web API, Telegram bot, and scheduler.

import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { publishFeedCommandAndWait } from '../mqtt/mqtt.service';
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

  // ── 1. Check daily feed limit ──────────────────────────────────────────────
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const device = await prisma.deviceStatus.findUnique({
    where: { id: 'device-1' },
  });
  const maxFeeds = device?.maxFeedsPerDay ?? env.maxFeedsPerDay;

  const todayFeedCount = await prisma.feedLog.count({
    where: {
      createdAt: { gte: todayStart },
      status: { in: ['SUCCESS', 'PENDING'] },
    },
  });

  if (todayFeedCount >= maxFeeds) {
    logger.warn(`Feed rejected: daily limit of ${maxFeeds} reached`);

    // Log the rejected attempt
    await prisma.feedLog.create({
      data: {
        source,
        status: 'FAILED',
        portion,
        userId,
        userName,
        requestId,
        message: `Daily feed limit of ${maxFeeds} reached`,
        completedAt: new Date(),
      },
    });

    return {
      success: false,
      message: `Daily feed limit of ${maxFeeds} reached. Try again tomorrow.`,
      requestId,
    };
  }

  // ── 2. Check cooldown ──────────────────────────────────────────────────────
  const lastSuccessfulFeed = await prisma.feedLog.findFirst({
    where: { status: 'SUCCESS' },
    orderBy: { completedAt: 'desc' },
  });

  if (lastSuccessfulFeed?.completedAt) {
    const elapsedSeconds = (Date.now() - lastSuccessfulFeed.completedAt.getTime()) / 1000;
    if (elapsedSeconds < env.feedCooldownSeconds) {
      const waitSeconds = Math.ceil(env.feedCooldownSeconds - elapsedSeconds);
      logger.warn(`Feed rejected: cooldown active, ${waitSeconds}s remaining`);

      await prisma.feedLog.create({
        data: {
          source,
          status: 'FAILED',
          portion,
          userId,
          userName,
          requestId,
          message: `Cooldown active. Wait ${waitSeconds} seconds before feeding again.`,
          completedAt: new Date(),
        },
      });

      return {
        success: false,
        message: `Feeder is cooling down. Please wait ${waitSeconds} seconds.`,
        requestId,
      };
    }
  }

  // ── 3. Create PENDING feed log ─────────────────────────────────────────────
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

  // ── 4. Publish MQTT command and wait for response ──────────────────────────
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
      data: {
        status: 'FAILED',
        message: errorMessage,
        completedAt: new Date(),
      },
    });

    return {
      success: false,
      message: errorMessage,
      requestId,
      feedLogId: feedLog.id,
    };
  }
}
