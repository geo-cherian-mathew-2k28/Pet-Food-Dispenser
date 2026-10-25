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
let inMemoryShowArchitecture: boolean = true;
let lastFeedCompletedAt: Date | null = null;
let cachedDevice: any = null;
let cachedDeviceTime = 0;
const CACHE_TTL_MS = 2500; // 2.5 seconds cache for fast polling

export function recordFeedCompleted(date = new Date()): void {
  lastFeedCompletedAt = date;
}

export function getCooldownRemainingSeconds(): number {
  if (inMemoryCooldownSeconds <= 0) return 0;
  if (!lastFeedCompletedAt) return 0;
  const elapsed = (Date.now() - lastFeedCompletedAt.getTime()) / 1000;
  return Math.max(0, Math.ceil(inMemoryCooldownSeconds - elapsed));
}

function loadRuntimeSettings(): void {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
      if (typeof data.feedCooldownSeconds === 'number') {
        inMemoryCooldownSeconds = data.feedCooldownSeconds;
        logger.info(`Loaded runtime feed cooldown: ${inMemoryCooldownSeconds}s`);
      }
      if (typeof data.showArchitectureToUsers === 'boolean') {
        inMemoryShowArchitecture = data.showArchitectureToUsers;
        logger.info(`Loaded runtime show architecture: ${inMemoryShowArchitecture}`);
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
  persistSettings();
  return inMemoryCooldownSeconds;
}

export function getArchitectureVisibility(): boolean {
  return inMemoryShowArchitecture;
}

export function setArchitectureVisibility(val: boolean): boolean {
  inMemoryShowArchitecture = val;
  persistSettings();
  return inMemoryShowArchitecture;
}

function persistSettings(): void {
  try {
    const dir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      SETTINGS_FILE,
      JSON.stringify(
        {
          feedCooldownSeconds: inMemoryCooldownSeconds,
          showArchitectureToUsers: inMemoryShowArchitecture,
        },
        null,
        2
      )
    );
  } catch (err) {
    logger.warn('Could not write runtime settings file');
  }
}

export async function getDeviceStatusRecord() {
  if (cachedDevice && Date.now() - cachedDeviceTime < CACHE_TTL_MS) {
    return cachedDevice;
  }

  // 1. Try to find existing device-1 record
  let device = await prisma.deviceStatus.findUnique({
    where: { id: 'device-1' },
  });

  if (device) {
    cachedDevice = device;
    cachedDeviceTime = Date.now();
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
        wifiStrength: firstDevice.wifiStrength,
        uptimeSeconds: firstDevice.uptimeSeconds,
        lastHeartbeatAt: firstDevice.lastHeartbeatAt,
      },
    });

    await prisma.deviceStatus.deleteMany({
      where: { id: { not: 'device-1' } },
    }).catch(() => {});

    cachedDevice = device;
    cachedDeviceTime = Date.now();
    return device;
  }

  // 3. Create initial device-1 record if table is completely empty
  const created = await prisma.deviceStatus.create({
    data: {
      id: 'device-1',
      status: 'OFFLINE',
      servoOpenDurationMs: 1500,
      maxFeedsPerDay: env.maxFeedsPerDay,
    },
  });
  cachedDevice = created;
  cachedDeviceTime = Date.now();
  return created;
}

export async function updateDeviceStatusRecord(updateData: Record<string, any>) {
  const device = await getDeviceStatusRecord();
  const updated = await prisma.deviceStatus.update({
    where: { id: device.id },
    data: updateData,
  });
  cachedDevice = updated;
  cachedDeviceTime = Date.now();
  return updated;
}

