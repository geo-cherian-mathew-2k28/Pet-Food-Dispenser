// SmartCat Feeder - Feed Routes
// REST endpoints for manual feeding, history, and stats.

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { authenticate } from '../../middleware/auth.middleware';
import { triggerFeed } from './feed.service';

export const feedsRouter = Router();

// All feed endpoints require authentication
feedsRouter.use(authenticate);

// ─── Feed Now ─────────────────────────────────────────────────────────────────
// POST /api/feeds/now
feedsRouter.post('/now', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({ portion: z.number().int().min(1).max(5).optional() });
    const { portion } = schema.parse(req.body);

    const result = await triggerFeed({
      source: 'WEB',
      userId: req.user!.userId,
      userName: req.user!.email,
      portion,
    });

    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    next(err);
  }
});

// ─── Feed History ─────────────────────────────────────────────────────────────
// GET /api/feeds?source=WEB&status=SUCCESS&from=2024-01-01&to=2024-12-31&limit=20&page=1
feedsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { source, status, from, to, limit = '20', page = '1' } = req.query as Record<string, string>;

    const take = Math.min(parseInt(limit, 10), 100);
    const skip = (parseInt(page, 10) - 1) * take;

    const where: Record<string, unknown> = {};
    if (source) where.source = source;
    if (status) where.status = status;
    if (from || to) {
      where.createdAt = {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to) }),
      };
    }

    const [feeds, total] = await Promise.all([
      prisma.feedLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.feedLog.count({ where }),
    ]);

    res.json({ feeds, total, page: parseInt(page, 10), limit: take });
  } catch (err) {
    next(err);
  }
});

// ─── Today's Feeds ────────────────────────────────────────────────────────────
// GET /api/feeds/today
feedsRouter.get('/today', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const feeds = await prisma.feedLog.findMany({
      where: { createdAt: { gte: todayStart } },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ feeds, count: feeds.length });
  } catch (err) {
    next(err);
  }
});

// ─── Feed Stats ───────────────────────────────────────────────────────────────
// GET /api/feeds/stats
feedsRouter.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Last 7 days feed counts
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const feeds7Days = await prisma.feedLog.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true, status: true, source: true },
      orderBy: { createdAt: 'asc' },
    });

    // Build daily summary
    const dailyMap: Record<string, { date: string; success: number; failed: number; total: number }> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      dailyMap[key] = { date: key, success: 0, failed: 0, total: 0 };
    }

    feeds7Days.forEach((f) => {
      const key = f.createdAt.toISOString().split('T')[0];
      if (dailyMap[key]) {
        dailyMap[key].total++;
        if (f.status === 'SUCCESS') dailyMap[key].success++;
        if (f.status === 'FAILED') dailyMap[key].failed++;
      }
    });

    const daily = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    // Overall totals
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [total, todayCount, successCount, failedCount, lastFeed] = await Promise.all([
      prisma.feedLog.count(),
      prisma.feedLog.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.feedLog.count({ where: { status: 'SUCCESS' } }),
      prisma.feedLog.count({ where: { status: 'FAILED' } }),
      prisma.feedLog.findFirst({ where: { status: 'SUCCESS' }, orderBy: { completedAt: 'desc' } }),
    ]);

    res.json({ total, todayCount, successCount, failedCount, daily, lastFeed });
  } catch (err) {
    next(err);
  }
});

// ─── Feed by ID ───────────────────────────────────────────────────────────────
// GET /api/feeds/:id
feedsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const feed = await prisma.feedLog.findUnique({ where: { id: req.params.id } });
    if (!feed) {
      res.status(404).json({ error: 'Feed log not found' });
      return;
    }
    res.json({ feed });
  } catch (err) {
    next(err);
  }
});
