// SmartCat Feeder - MQTT Service
// Manages connection to the MQTT broker, publishing commands, and handling device responses.

import mqtt, { MqttClient } from 'mqtt';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { prisma } from '../../config/prisma';
import { recordLockAcquired, clearLockTimestamp } from '../../utils/dispensingLock';
import { getDeviceStatusRecord, updateDeviceStatusRecord } from '../device/device.service';

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
  // Security Guard: Limit payload size to 2KB to prevent memory exhaustion / DoS
  if (payloadBuffer.length > 2048) {
    logger.warn(`MQTT Security Alert: Dropped oversized payload (${payloadBuffer.length} bytes) on topic ${topic}`);
    return;
  }

  const payload = payloadBuffer.toString();

  try {
    const data = JSON.parse(payload);
    if (!data || typeof data !== 'object') return;

    logger.debug(`MQTT received [${topic}]: ${payload}`);

    switch (topic) {
      case TOPICS.HEARTBEAT:
        // Validate types for heartbeat payload
        if (typeof data.uptimeSeconds === 'number' && typeof data.wifiStrength === 'number') {
          await handleHeartbeat({
            status: String(data.status || 'online').substring(0, 20),
            uptimeSeconds: Math.max(0, Math.min(data.uptimeSeconds, 315360000)), // max 10 years
            wifiStrength: Math.max(-120, Math.min(data.wifiStrength, 0)),
            createdAt: String(data.createdAt || '').substring(0, 50),
          });
        }
        break;

      case TOPICS.RESPONSE:
        // Security Guard: Validate requestId format (alphanumeric and dashes only)
        if (data.requestId && typeof data.requestId === 'string' && /^[a-zA-Z0-9\-_]{1,64}$/.test(data.requestId)) {
          const validatedResponse: DeviceResponse = {
            requestId: data.requestId,
            status: data.status === 'success' ? 'success' : 'failed',
            message: String(data.message || '').substring(0, 255),
            servoAngle: typeof data.servoAngle === 'number' ? data.servoAngle : undefined,
            durationMs: typeof data.durationMs === 'number' ? data.durationMs : undefined,
            createdAt: String(data.createdAt || '').substring(0, 50),
          };
          await handleDeviceResponse(validatedResponse);
        } else {
          logger.warn(`MQTT Security Alert: Dropped response with invalid or missing requestId format`);
        }
        break;

      case TOPICS.ERROR:
        logger.error(`Device error: ${String(data.message || data.error || payload).substring(0, 255)}`);
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
    await updateDeviceStatusRecord({
      status: 'ONLINE',
      lastHeartbeatAt: new Date(),
      uptimeSeconds: data.uptimeSeconds,
      wifiStrength: data.wifiStrength,
      lastMessage: `Heartbeat at ${new Date().toISOString()}`,
      updatedAt: new Date(),
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
    const result = await prisma.feedLog.updateMany({
      where: { requestId },
      data: {
        status: status === 'success' ? 'SUCCESS' : 'FAILED',
        message,
        completedAt: new Date(),
      },
    });
    if (result.count > 0) {
      logger.info(`Feed response [${requestId}]: ${status} - ${message}`);
    } else {
      logger.debug(`Feed response [${requestId}] received, but no matching DB record was found (likely a manual/serial test).`);
    }
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
  recordLockAcquired(); // start the stale-lock timer

  // Fetch configured servo open duration from DB
  let durationMs = 1500;
  try {
    const device = await getDeviceStatusRecord();
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
  const device = await getDeviceStatusRecord();
  const customTimeoutMs = device?.servoOpenDurationMs ? (device.servoOpenDurationMs * payload.portion + 5000) : timeoutMs;

  return new Promise(async (resolve, reject) => {
    const published = await publishFeedCommand(payload);

    if (!published) {
      // publishFeedCommand may have failed without setting the lock — ensure it's clean
      if (serverDispensingRequestId === payload.requestId) {
        releaseDispensingLock();
      }
      reject(new Error('Device is offline - MQTT not connected'));
      return;
    }

    // Set timeout if device doesn't respond
    const timer = setTimeout(() => {
      pendingResponses.delete(payload.requestId);
      // *** Critical fix: release the dispensing lock on timeout so future feeds aren't blocked ***
      if (serverDispensingRequestId === payload.requestId) {
        releaseDispensingLock();
        logger.warn(`Dispensing lock auto-released after timeout for [${payload.requestId}]`);
      }
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
  clearLockTimestamp();
  logger.warn('Dispensing lock force-released');
}

/**
 * Called by a cron job to mark device offline if heartbeat is stale.
 * Threshold = 120s — allows for external power reconnection cycles
 * (Arduino sends heartbeat every 25s, so 120s = ~4.8 missed beats).
 */
export async function checkDeviceHeartbeatTimeout(): Promise<void> {
  try {
    const device = await getDeviceStatusRecord();

    if (!device) return;

    if (device.status === 'ONLINE' && device.lastHeartbeatAt) {
      const elapsedMs = Date.now() - device.lastHeartbeatAt.getTime();
      if (elapsedMs > 120_000) {
        // 120 seconds without heartbeat = truly offline
        await updateDeviceStatusRecord({ status: 'OFFLINE', lastMessage: 'Heartbeat timeout (>120s)' });
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
