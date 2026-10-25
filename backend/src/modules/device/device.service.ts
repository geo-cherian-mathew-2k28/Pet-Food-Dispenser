// SmartCat Feeder - Device Service
// Centralized manager for single DeviceStatus database record.
// Prevents duplicate rows and ensures setting persistence.

import fs from 'fs';
import path from 'path';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

const SETTINGS_FILE = path.join(__dirname, '../../../data/device_settings.json');

let inMemoryCooldownSeconds: number = env.feedCooldownSeconds;

function loadRuntimeSettings(): void {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
      if (typeof data.feedCooldownSeconds === 'number') {
        inMemoryCooldownSeconds = data.feedCooldownSeconds;
        logger.info(`Loaded runtime feed cooldown: ${inMemoryCooldownSeconds}s`);
      }
    }
  } catch (err) {
    logger.warn('Could not read runtime settings file, using default');
  }
}

loadRuntimeSettings();

export function getFeedCooldownSeconds(): number {
  return inMemoryCooldownSeconds;
}

export function setFeedCooldownSeconds(val: number): number {
  inMemoryCooldownSeconds = Math.max(0, val);
  try {
    const dir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify({ feedCooldownSeconds: inMemoryCooldownSeconds }, null, 2));
    logger.info(`Persisted runtime feed cooldown: ${inMemoryCooldownSeconds}s`);
  } catch (err) {
    logger.warn('Could not write runtime settings file');
  }
  return inMemoryCooldownSeconds;
}

export async function getDeviceStatusRecord() {
  // 1. Try to find existing device-1 record
  let device = await prisma.deviceStatus.findUnique({
    where: { id: 'device-1' },
  });

  if (device) {
    return device;
  }

  // 2. If device-1 doesn't exist yet, check if there are legacy rows with CUIDs
  const firstDevice = await prisma.deviceStatus.findFirst({
    orderBy: { updatedAt: 'asc' },
  });

  if (firstDevice) {
    // Migrate settings from legacy row to device-1
    device = await prisma.deviceStatus.create({
      data: {
        id: 'device-1',
        status: firstDevice.status,
        servoOpenDurationMs: firstDevice.servoOpenDurationMs,
        maxFeedsPerDay: firstDevice.maxFeedsPerDay,
        showArchitectureToUsers: firstDevice.showArchitectureToUsers,
        wifiStrength: firstDevice.wifiStrength,
        uptimeSeconds: firstDevice.uptimeSeconds,
        lastHeartbeatAt: firstDevice.lastHeartbeatAt,
      },
    });

    await prisma.deviceStatus.deleteMany({
      where: { id: { not: 'device-1' } },
    }).catch(() => {});

    return device;
  }

  // 3. Create initial device-1 record if table is completely empty
  return prisma.deviceStatus.create({
    data: {
      id: 'device-1',
      status: 'OFFLINE',
      servoOpenDurationMs: 1500,
      maxFeedsPerDay: env.maxFeedsPerDay,
      showArchitectureToUsers: true,
    },
  });
}

export async function updateDeviceStatusRecord(updateData: Record<string, any>) {
  const device = await getDeviceStatusRecord();
  return prisma.deviceStatus.update({
    where: { id: device.id },
    data: updateData,
  });
}

