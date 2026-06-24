// SmartCat Feeder - Schedule Routes
// CRUD endpoints for managing automatic feeding schedules.

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { authenticate } from '../../middleware/auth.middleware';

export const schedulesRouter = Router();

schedulesRouter.use(authenticate);

// ─── Validation ───────────────────────────────────────────────────────────────
const scheduleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format (e.g. 08:00)'),
  portion: z.number().int().min(1).max(5).default(1),
  enabled: z.boolean().default(true),
  // comma-separated day numbers 0=Sun, 1=Mon, ... 6=Sat
  daysOfWeek: z
    .string()
    .regex(/^[0-6](,[0-6])*$/, 'daysOfWeek must be comma-separated numbers 0-6'),
});

// ─── Create Schedule ──────────────────────────────────────────────────────────
// POST /api/schedules
schedulesRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = scheduleSchema.parse(req.body);
    const schedule = await prisma.schedule.create({
      data: { ...data, userId: req.user!.userId },
    });
    res.status(201).json({ schedule });
  } catch (err) {
    next(err);
  }
});

// ─── List Schedules ───────────────────────────────────────────────────────────
// GET /api/schedules
schedulesRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schedules = await prisma.schedule.findMany({
      where: { userId: req.user!.userId },
      orderBy: { time: 'asc' },
    });
    res.json({ schedules });
  } catch (err) {
    next(err);
  }
});

// ─── Update Schedule ──────────────────────────────────────────────────────────
// PUT /api/schedules/:id
schedulesRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = scheduleSchema.partial().parse(req.body);

    // Ensure the schedule belongs to the current user
    const existing = await prisma.schedule.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });
    if (!existing) {
      res.status(404).json({ error: 'Schedule not found' });
      return;
    }

    const schedule = await prisma.schedule.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ schedule });
  } catch (err) {
    next(err);
  }
});

// ─── Delete Schedule ──────────────────────────────────────────────────────────
// DELETE /api/schedules/:id
schedulesRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.schedule.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });
    if (!existing) {
      res.status(404).json({ error: 'Schedule not found' });
      return;
    }

    await prisma.schedule.delete({ where: { id: req.params.id } });
    res.json({ message: 'Schedule deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// ─── Toggle Schedule ──────────────────────────────────────────────────────────
// PATCH /api/schedules/:id/toggle
schedulesRouter.patch('/:id/toggle', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.schedule.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });
    if (!existing) {
      res.status(404).json({ error: 'Schedule not found' });
      return;
    }

    const schedule = await prisma.schedule.update({
      where: { id: req.params.id },
      data: { enabled: !existing.enabled },
    });
    res.json({ schedule });
  } catch (err) {
    next(err);
  }
});
