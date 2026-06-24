// SmartCat Feeder - Device Routes
// Returns real-time device online/offline status and last heartbeat info.

import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { authenticate } from '../../middleware/auth.middleware';
import { getMqttConnectionStatus } from '../mqtt/mqtt.service';

export const deviceRouter = Router();

deviceRouter.use(authenticate);

// ─── Device Status ────────────────────────────────────────────────────────────
// GET /api/device/status
deviceRouter.get('/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const device = await prisma.deviceStatus.findUnique({
      where: { id: 'device-1' },
    });

    res.json({
      device: device
        ? { ...device, feedCooldownSeconds: env.feedCooldownSeconds }
        : {
            id: 'device-1',
            status: 'OFFLINE',
            lastHeartbeatAt: null,
            uptimeSeconds: null,
            wifiStrength: null,
            lastMessage: 'No data received yet',
            servoOpenDurationMs: 1500,
            feedCooldownSeconds: env.feedCooldownSeconds,
          },
      mqttConnected: getMqttConnectionStatus(),
    });
  } catch (err) {
    next(err);
  }
});

// ─── Device Settings ──────────────────────────────────────────────────────────
// POST /api/device/settings
deviceRouter.post('/settings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { servoOpenDurationMs } = req.body;

    if (typeof servoOpenDurationMs !== 'number' || servoOpenDurationMs < 100 || servoOpenDurationMs > 30000) {
      res.status(400).json({ error: 'servoOpenDurationMs must be a number between 100 and 30000 ms' });
      return;
    }

    const device = await prisma.deviceStatus.upsert({
      where: { id: 'device-1' },
      update: {
        servoOpenDurationMs,
      },
      create: {
        id: 'device-1',
        status: 'OFFLINE',
        servoOpenDurationMs,
      },
    });

    res.json({ message: 'Settings updated successfully', device });
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
