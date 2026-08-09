// SmartCat Feeder - Device Routes
// Returns real-time device online/offline status, last heartbeat info, and admin settings.

import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { authenticate } from '../../middleware/auth.middleware';
import { getMqttConnectionStatus, releaseDispensingLock, getIsDispensing } from '../mqtt/mqtt.service';

export const deviceRouter = Router();

deviceRouter.use(authenticate);

// ─── Device Status ────────────────────────────────────────────────────────────
// ─── Device Status ────────────────────────────────────────────────────────────
// GET /api/device/status
deviceRouter.get('/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    let device = await prisma.deviceStatus.findFirst();
    if (!device) {
      device = await prisma.deviceStatus.create({
        data: {
          id: 'device-1',
          status: 'OFFLINE',
          servoOpenDurationMs: 1500,
          maxFeedsPerDay: env.maxFeedsPerDay,
          showArchitectureToUsers: true,
        },
      });
    }

    res.json({
      device: {
        ...device,
        feedCooldownSeconds: env.feedCooldownSeconds,
        showArchitectureToUsers: device.showArchitectureToUsers ?? true,
      },
      mqttConnected: getMqttConnectionStatus(),
      isDispensing: getIsDispensing(),
    });
  } catch (err) {
    next(err);
  }
});

// ─── Device Settings ──────────────────────────────────────────────────────────
// POST /api/device/settings
// - servoOpenDurationMs: all authenticated users
// - maxFeedsPerDay: admin only
// - showArchitectureToUsers: admin only
deviceRouter.post('/settings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { servoOpenDurationMs, maxFeedsPerDay, showArchitectureToUsers } = req.body;

    // Validate servo duration if provided
    if (servoOpenDurationMs !== undefined) {
      if (typeof servoOpenDurationMs !== 'number' || servoOpenDurationMs < 100 || servoOpenDurationMs > 30000) {
        res.status(400).json({ error: 'servoOpenDurationMs must be a number between 100 and 30000 ms' });
        return;
      }
    }

    // maxFeedsPerDay is admin-only
    if (maxFeedsPerDay !== undefined) {
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({ error: 'Only admins can change the daily feed limit' });
        return;
      }
      if (typeof maxFeedsPerDay !== 'number' || !Number.isInteger(maxFeedsPerDay) || maxFeedsPerDay < 1 || maxFeedsPerDay > 100) {
        res.status(400).json({ error: 'maxFeedsPerDay must be an integer between 1 and 100' });
        return;
      }
    }

    // showArchitectureToUsers is admin-only
    if (showArchitectureToUsers !== undefined) {
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({ error: 'Only admins can change architecture visibility' });
        return;
      }
      if (typeof showArchitectureToUsers !== 'boolean') {
        res.status(400).json({ error: 'showArchitectureToUsers must be a boolean' });
        return;
      }
    }

    const updateData: Record<string, unknown> = {};
    if (servoOpenDurationMs !== undefined) updateData.servoOpenDurationMs = servoOpenDurationMs;
    if (maxFeedsPerDay !== undefined) updateData.maxFeedsPerDay = maxFeedsPerDay;
    if (showArchitectureToUsers !== undefined) updateData.showArchitectureToUsers = showArchitectureToUsers;

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ error: 'No valid settings fields provided' });
      return;
    }

    let existingDevice = await prisma.deviceStatus.findFirst();
    let device;

    if (existingDevice) {
      device = await prisma.deviceStatus.update({
        where: { id: existingDevice.id },
        data: updateData,
      });
    } else {
      device = await prisma.deviceStatus.create({
        data: {
          id: 'device-1',
          status: 'OFFLINE',
          servoOpenDurationMs: servoOpenDurationMs ?? 1500,
          maxFeedsPerDay: maxFeedsPerDay ?? env.maxFeedsPerDay,
          showArchitectureToUsers: showArchitectureToUsers ?? true,
          ...updateData,
        },
      });
    }

    res.json({ message: 'Settings updated successfully', device });
  } catch (err) {
    next(err);
  }
});

// ─── Debug: show DB values + today's feed count ───────────────────────────────
// GET /api/device/debug  (admin only)
deviceRouter.get('/debug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user?.role !== 'ADMIN') {
      res.status(403).json({ error: 'Admin only' });
      return;
    }

    // 1. Cleanup temporary test users and related records
    const usersToDelete = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: 'temp-' } },
          { email: { contains: 'final-check' } },
          { email: { contains: 'poll-' } },
          { email: { contains: 'test-admin' } },
          { email: { contains: 'test-user' } }
        ],
        NOT: { id: req.user!.userId }
      },
      select: { id: true }
    });
    const userIds = usersToDelete.map(u => u.id);
    if (userIds.length > 0) {
      await prisma.feedLog.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.schedule.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }

    const device = await prisma.deviceStatus.findUnique({ where: { id: 'device-1' } });
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const successCount = await prisma.feedLog.count({
      where: { createdAt: { gte: todayStart }, status: 'SUCCESS' },
    });
    const pendingCount = await prisma.feedLog.count({
      where: { createdAt: { gte: todayStart }, status: 'PENDING' },
    });
    res.json({
      device,
      envMaxFeedsPerDay: env.maxFeedsPerDay,
      effectiveLimit: device?.maxFeedsPerDay ?? env.maxFeedsPerDay,
      todaySuccessCount: successCount,
      todayPendingCount: pendingCount,
      cleanedUsersCount: userIds.length
    });
  } catch (err) {
    next(err);
  }
});

// ─── Admin: reset today's non-success logs ────────────────────────────────────
// POST /api/device/reset-today  (admin only)
deviceRouter.post('/reset-today', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user?.role !== 'ADMIN') {
      res.status(403).json({ error: 'Admin only' });
      return;
    }
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const result = await prisma.feedLog.updateMany({
      where: {
        createdAt: { gte: todayStart },
        status: { in: ['PENDING', 'FAILED'] },
      },
      data: { status: 'FAILED', message: 'Manually reset by admin', completedAt: new Date() },
    });
    const successCount = await prisma.feedLog.count({
      where: { createdAt: { gte: todayStart }, status: 'SUCCESS' },
    });
    res.json({ message: `Reset ${result.count} logs. Today's SUCCESS count: ${successCount}` });
  } catch (err) {
    next(err);
  }
});

// ─── Last Heartbeat ───────────────────────────────────────────────────────────
// GET /api/device/heartbeat
deviceRouter.get('/heartbeat', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const device = await prisma.deviceStatus.findUnique({
      where: { id: 'device-1' },
      select: { lastHeartbeatAt: true, uptimeSeconds: true, wifiStrength: true, status: true },
    });

    res.json({ heartbeat: device });
  } catch (err) {
    next(err);
  }
});

// ─── Admin: force-release stuck dispensing lock ────────────────────────────────
// POST /api/device/release-lock  (admin only)
// Use this if the server's in-memory dispensing lock gets stuck (e.g. after a timeout race condition).
deviceRouter.post('/release-lock', (req: Request, res: Response) => {
  if (req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Admin only' });
    return;
  }
  const wasLocked = getIsDispensing();
  if (wasLocked) {
    releaseDispensingLock();
    res.json({ message: 'Dispensing lock force-released. Feeder is ready.', wasLocked });
  } else {
    res.json({ message: 'No active dispensing lock found.', wasLocked });
  }
});
