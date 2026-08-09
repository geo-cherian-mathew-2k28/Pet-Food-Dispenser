// SmartCat Feeder - Device Service
// Centralized manager for single DeviceStatus database record.
// Prevents duplicate rows and ensures setting persistence.

import { prisma } from '../../config/prisma';
import { env } from '../../config/env';

export async function getDeviceStatusRecord() {
  // 1. Try to find existing device-1 record
  let device = await prisma.deviceStatus.findUnique({
    where: { id: 'device-1' },
  });

  if (device) {
    // Delete any orphan/duplicate rows that are not device-1
    await prisma.deviceStatus.deleteMany({
      where: { id: { not: 'device-1' } },
    }).catch(() => {});
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

