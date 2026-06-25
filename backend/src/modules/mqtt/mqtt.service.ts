// SmartCat Feeder - MQTT Service
// Manages connection to the MQTT broker, publishing commands, and handling device responses.

import mqtt, { MqttClient } from 'mqtt';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { prisma } from '../../config/prisma';

// ─── MQTT Topic Constants ─────────────────────────────────────────────────────
export const TOPICS = {
  get COMMAND() { return `smartcat/${env.mqtt.namespace}/device/command`; },
  get STATUS() { return `smartcat/${env.mqtt.namespace}/device/status`; },
  get HEARTBEAT() { return `smartcat/${env.mqtt.namespace}/device/heartbeat`; },
  get RESPONSE() { return `smartcat/${env.mqtt.namespace}/device/response`; },
  get ERROR() { return `smartcat/${env.mqtt.namespace}/device/error`; },
};

// ─── State ────────────────────────────────────────────────────────────────────
let client: MqttClient | null = null;
let isConnected = false;

// Server-side dispensing lock — blocks simultaneous feed requests
let isServerDispensing = false;
let serverDispensingRequestId = '';

// Map of requestId → resolver function (for awaiting device responses)
const pendingResponses = new Map<string, (result: DeviceResponse) => void>();

export interface DeviceResponse {
  requestId: string;
  status: 'success' | 'failed';
  message: string;
  servoAngle?: number;
  durationMs?: number;
  createdAt: string;
}

// ─── Connect ─────────────────────────────────────────────────────────────────
export function connectMqtt(): void {
  logger.info(`Connecting to MQTT broker: ${env.mqtt.host}:${env.mqtt.port}`);

  client = mqtt.connect({
    host: env.mqtt.host,
    port: env.mqtt.port,
    protocol: env.mqtt.port === 8883 ? 'mqtts' : 'mqtt',
    ...(env.mqtt.username ? { username: env.mqtt.username, password: env.mqtt.password } : {}),
    clientId: `${env.mqtt.clientId}-${Math.random().toString(36).substring(2, 8)}`,
    reconnectPeriod: 3000,    // faster reconnect
    connectTimeout: 8000,     // faster timeout
    keepalive: 20,            // 20s keepalive to detect stale connections faster
    clean: true,
  });

  client.on('connect', () => {
    isConnected = true;
    logger.info('✅ MQTT connected successfully');

    // Subscribe to all device-to-backend topics
    client!.subscribe([TOPICS.RESPONSE, TOPICS.HEARTBEAT, TOPICS.ERROR, TOPICS.STATUS], (err) => {
      if (err) {
        logger.error('MQTT subscription error:', err);
      } else {
        logger.info('Subscribed to device topics');
      }
    });
  });

  client.on('message', handleMessage);

  client.on('error', (err) => {
    logger.error('MQTT error:', err);
    isConnected = false;
  });

  client.on('offline', () => {
    isConnected = false;
    logger.warn('MQTT client went offline');
  });

  client.on('reconnect', () => {
    logger.info('MQTT reconnecting...');
  });

  client.on('disconnect', () => {
    isConnected = false;
    logger.warn('MQTT disconnected');
  });
}

// ─── Message Handler ─────────────────────────────────────────────────────────
async function handleMessage(topic: string, payloadBuffer: Buffer): Promise<void> {
  const payload = payloadBuffer.toString();

  try {
    const data = JSON.parse(payload);
    logger.debug(`MQTT received [${topic}]: ${payload}`);

    switch (topic) {
      case TOPICS.HEARTBEAT:
        await handleHeartbeat(data);
        break;

      case TOPICS.RESPONSE:
        await handleDeviceResponse(data as DeviceResponse);
        break;

      case TOPICS.ERROR:
        logger.error(`Device error: ${data.message || payload}`);
        break;

      default:
        logger.debug(`Unhandled MQTT topic: ${topic}`);
    }
  } catch (err) {
    logger.error(`Failed to parse MQTT message on topic ${topic}: ${err}`);
  }
}

// ─── Heartbeat Handler ────────────────────────────────────────────────────────
async function handleHeartbeat(data: {
  status: string;
  uptimeSeconds: number;
  wifiStrength: number;
  createdAt: string;
}): Promise<void> {
  try {
    // Upsert the single device status record (we use a fixed id "device-1")
    await prisma.deviceStatus.upsert({
      where: { id: 'device-1' },
      update: {
        status: 'ONLINE',
        lastHeartbeatAt: new Date(),
        uptimeSeconds: data.uptimeSeconds,
        wifiStrength: data.wifiStrength,
        lastMessage: `Heartbeat at ${new Date().toISOString()}`,
        updatedAt: new Date(),
      },
      create: {
        id: 'device-1',
        status: 'ONLINE',
        lastHeartbeatAt: new Date(),
        uptimeSeconds: data.uptimeSeconds,
        wifiStrength: data.wifiStrength,
        lastMessage: `First heartbeat`,
      },
    });
    logger.debug(`Heartbeat received: uptime ${data.uptimeSeconds}s, WiFi ${data.wifiStrength}dBm`);
  } catch (err) {
    logger.error('Failed to update device status from heartbeat:', err);
  }
}

// ─── Device Response Handler ──────────────────────────────────────────────────
async function handleDeviceResponse(data: DeviceResponse): Promise<void> {
  const { requestId, status, message } = data;

  // Release server-side dispensing lock
  if (serverDispensingRequestId === requestId) {
    isServerDispensing = false;
    serverDispensingRequestId = '';
    logger.info(`Dispensing lock released for [${requestId}]`);
  }

  // Update feed log with the response
  try {
    await prisma.feedLog.update({
      where: { requestId },
      data: {
        status: status === 'success' ? 'SUCCESS' : 'FAILED',
        message,
        completedAt: new Date(),
      },
    });
    logger.info(`Feed response [${requestId}]: ${status} - ${message}`);
  } catch (err) {
    logger.error(`Failed to update feed log for requestId ${requestId}:`, err);
  }

  // Resolve any pending awaiter
  const resolver = pendingResponses.get(requestId);
  if (resolver) {
    resolver(data);
    pendingResponses.delete(requestId);
  }
}

// ─── Publish Command ──────────────────────────────────────────────────────────
export async function publishFeedCommand(payload: {
  requestId: string;
  source: string;
  userId: string;
  userName: string;
  portion: number;
}): Promise<boolean> {
  if (!client || !isConnected) {
    logger.error('Cannot publish: MQTT not connected');
    return false;
  }

  // Server-side simultaneous feed guard
  if (isServerDispensing) {
    logger.warn(`Simultaneous feed blocked. Active request: ${serverDispensingRequestId}`);
    return false;
  }

  // Set dispensing lock
  isServerDispensing = true;
  serverDispensingRequestId = payload.requestId;

  // Fetch configured servo open duration from DB
  let durationMs = 1500;
  try {
    const device = await prisma.deviceStatus.findUnique({
      where: { id: 'device-1' },
    });
    if (device && device.servoOpenDurationMs) {
      durationMs = device.servoOpenDurationMs;
    }
  } catch (err) {
    logger.error('Failed to fetch device status for duration:', err);
  }

  const message = JSON.stringify({
    command: 'feed',
    ...payload,
    durationMs,
    createdAt: new Date().toISOString(),
  });

  return new Promise((resolve) => {
    client!.publish(TOPICS.COMMAND, message, { qos: 1 }, (err) => {
      if (err) {
        logger.error('Failed to publish feed command:', err);
        isServerDispensing = false;
        serverDispensingRequestId = '';
        resolve(false);
      } else {
        logger.info(`Published feed command [${payload.requestId}] with duration ${durationMs}ms`);
        resolve(true);
      }
    });
  });
}

/**
 * Publish feed command and wait for device response with timeout.
 */
export async function publishFeedCommandAndWait(
  payload: {
    requestId: string;
    source: string;
    userId: string;
    userName: string;
    portion: number;
  },
  timeoutMs = 15000
): Promise<DeviceResponse> {
  const device = await prisma.deviceStatus.findUnique({
    where: { id: 'device-1' },
  });
  const customTimeoutMs = device?.servoOpenDurationMs ? (device.servoOpenDurationMs * payload.portion + 5000) : timeoutMs;

  return new Promise(async (resolve, reject) => {
    const published = await publishFeedCommand(payload);

    if (!published) {
      reject(new Error('Device is offline - MQTT not connected'));
      return;
    }

    // Set timeout if device doesn't respond
    const timer = setTimeout(() => {
      pendingResponses.delete(payload.requestId);
      reject(new Error('Device response timeout - check if Arduino is online'));
    }, customTimeoutMs);

    pendingResponses.set(payload.requestId, (result) => {
      clearTimeout(timer);
      resolve(result);
    });
  });
}

// ─── Status Helpers ───────────────────────────────────────────────────────────
export function getMqttConnectionStatus(): boolean {
  return isConnected;
}

/**
 * Returns whether the server currently has a dispensing lock active.
 */
export function getIsDispensing(): boolean {
  return isServerDispensing;
}

/**
 * Force-release the server dispensing lock (safety valve for timeouts).
 */
export function releaseDispensingLock(): void {
  isServerDispensing = false;
  serverDispensingRequestId = '';
  logger.warn('Dispensing lock force-released');
}

/**
 * Called by a cron job to mark device offline if heartbeat is stale.
 * Threshold = 120s — allows for external power reconnection cycles
 * (Arduino sends heartbeat every 25s, so 120s = ~4.8 missed beats).
 */
export async function checkDeviceHeartbeatTimeout(): Promise<void> {
  try {
    const device = await prisma.deviceStatus.findUnique({ where: { id: 'device-1' } });

    if (!device) return;

    if (device.status === 'ONLINE' && device.lastHeartbeatAt) {
      const elapsedMs = Date.now() - device.lastHeartbeatAt.getTime();
      if (elapsedMs > 120_000) {
        // 120 seconds without heartbeat = truly offline
        await prisma.deviceStatus.update({
          where: { id: 'device-1' },
          data: { status: 'OFFLINE', lastMessage: 'Heartbeat timeout (>120s)' },
        });
        logger.warn('Device marked OFFLINE due to heartbeat timeout (>120s)');

        // Also release any stuck dispensing lock if device went offline mid-feed
        if (isServerDispensing) {
          releaseDispensingLock();
        }
      }
    }
  } catch (err) {
    logger.error('Failed to check heartbeat timeout:', err);
  }
}
