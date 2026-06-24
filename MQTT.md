# MQTT.md — SmartCat Feeder MQTT Protocol

## Broker Setup

**Recommended: HiveMQ Cloud (free tier)**

1. Go to [hivemq.com/mqtt-cloud-broker](https://www.hivemq.com/mqtt-cloud-broker/)
2. Create a free account
3. Create a new free cluster
4. Go to **Access Management** → Create credentials (username + password)
5. Note your cluster URL: `your-id.s1.eu.hivemq.cloud`
6. Use port `8883` (TLS)

**Alternative: EMQX Cloud free tier** — similar setup at [emqx.com/en/cloud](https://www.emqx.com/en/cloud)

**Local development: Mosquitto via Docker**
```bash
docker run -it -p 1883:1883 -p 9001:9001 eclipse-mosquitto
```
For local, use port `1883` (no TLS). Change `MQTT_PORT=1883` in `.env`.

---

## Topic Structure

```
smartcat/device/command     ← Backend → Arduino (feed commands)
smartcat/device/response    ← Arduino → Backend (feed results)
smartcat/device/heartbeat   ← Arduino → Backend (every 30 seconds)
smartcat/device/status      ← Arduino → Backend (online/offline)
smartcat/device/error       ← Arduino → Backend (error messages)
```

---

## Message Formats

### Feed Command (Backend publishes → Arduino receives)
**Topic:** `smartcat/device/command`
```json
{
  "command": "feed",
  "requestId": "abc123def456xyz",
  "source": "web",
  "userId": "clxxx123",
  "userName": "Geo",
  "portion": 1,
  "createdAt": "2024-01-15T08:00:00.000Z"
}
```

### Feed Response - Success (Arduino publishes → Backend receives)
**Topic:** `smartcat/device/response`
```json
{
  "requestId": "abc123def456xyz",
  "status": "success",
  "message": "Food dispensed",
  "servoAngle": 90,
  "durationMs": 1500,
  "createdAt": "T+00:00:01.523"
}
```

### Feed Response - Failure
**Topic:** `smartcat/device/response`
```json
{
  "requestId": "abc123def456xyz",
  "status": "failed",
  "message": "Servo error or invalid command",
  "createdAt": "T+00:00:01.523"
}
```

### Heartbeat (Arduino → Backend, every 30 seconds)
**Topic:** `smartcat/device/heartbeat`
```json
{
  "status": "online",
  "uptimeSeconds": 120,
  "wifiStrength": -55,
  "createdAt": "T+00:02:00.000"
}
```
If no heartbeat is received for **90 seconds**, the backend marks the device **OFFLINE**.

### Device Status (Arduino → Backend on connect/disconnect)
**Topic:** `smartcat/device/status`
```json
{ "status": "online", "createdAt": "T+00:00:00.001" }
```

### Error (Arduino → Backend)
**Topic:** `smartcat/device/error`
```json
{ "error": "Invalid JSON payload", "createdAt": "T+00:01:23.000" }
```

---

## QoS Levels

- Feed commands use **QoS 1** (at least once) to ensure delivery
- Heartbeats use **QoS 0** (fire and forget) for efficiency

---

## Testing MQTT with MQTTX

1. Download [MQTTX](https://mqttx.app/) (free MQTT client)
2. Connect to your HiveMQ broker with your credentials
3. Subscribe to `smartcat/#` to see all messages
4. Publish a test feed command to `smartcat/device/command`:
```json
{
  "command": "feed",
  "requestId": "test-manual-001",
  "source": "manual",
  "userId": "test",
  "userName": "Tester",
  "portion": 1,
  "createdAt": "2024-01-01T00:00:00Z"
}
```
5. Watch Arduino Serial Monitor for response
