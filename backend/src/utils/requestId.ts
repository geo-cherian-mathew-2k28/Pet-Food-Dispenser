// SmartCat Feeder - Request ID Utility
// Generates unique IDs to correlate MQTT commands with device responses.

import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a short unique request ID to correlate feed commands with Arduino responses.
 * Uses first 8 characters of a UUID for brevity.
 */
export function generateRequestId(): string {
  return uuidv4().replace(/-/g, '').substring(0, 16);
}
