// SmartCat Feeder - Device Service
// Centralized manager for single DeviceStatus database record.
// Prevents duplicate rows and ensures setting persistence.

import { prisma } from '../../config/prisma';
import { env } from '../../config/env';

export async function getDeviceStatusRecord() {
  const devices = await prisma.deviceStatus.findMany({
    orderBy: { updatedAt: 'desc' },
  });

  if (devices.length === 0) {
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

  // Clean up any legacy duplicate rows created by old hardcoded upsert queries
  if (devices.length > 1) {
    const [keepDevice, ...duplicateDevices] = devices;
    await prisma.deviceStatus.deleteMany({
      where: { id: { in: duplicateDevices.map(d => d.id) } },
    });
    return keepDevice;
  }

  return devices[0];
}

export async function updateDeviceStatusRecord(updateData: Record<string, any>) {
  const device = await getDeviceStatusRecord();
  return prisma.deviceStatus.update({
    where: { id: device.id },
    data: updateData,
  });
}
