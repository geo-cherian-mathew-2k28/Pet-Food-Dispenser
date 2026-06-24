/*
 * =============================================================================
 *  SmartCat Feeder - Arduino UNO R4 WiFi Firmware
 * =============================================================================
 *  Hardware  : Arduino UNO R4 WiFi
 *  Libraries : WiFiS3, ArduinoMqttClient, Servo, ArduinoJson
 *
 *  Wiring (SG90 / MG995 Servo):
 *    Brown / Black wire  → GND
 *    Red wire            → 5V  (use external 5V supply if servo jitters)
 *    Orange / Yellow     → D9  (PWM signal pin)
 *
 *  Servo behaviour:
 *    CLOSED_ANGLE = 0    →  hopper sealed
 *    OPEN_ANGLE   = 160  →  hopper open — adjust based on your build
 *    Open duration is configurable from the web dashboard.
 * =============================================================================
 */

#include <WiFiS3.h>
#include <PubSubClient.h>
#include <Servo.h>
#include <ArduinoJson.h>

// =============================================================================
//  ⚙️  USER CONFIGURATION — Change only these values
// =============================================================================

char WIFI_SSID[]     = "Mullananickal KvFi";
char WIFI_PASSWORD[] = "geo@6756";

// ── MQTT ──────────────────────────────────────────────────────────────────────
// USE_TLS false = plain TCP port 1883 (public broker, no NTP needed)
// USE_TLS true  = TLS port 8883 (HiveMQ Cloud — requires stable NTP)
#define USE_TLS false

#if USE_TLS
  const char MQTT_BROKER[] = "1929ae9bc33d4ba29b4aa4f909c3ef85.s1.eu.hivemq.cloud";
  const int  MQTT_PORT     = 8883;
  const char MQTT_USERNAME[] = "geo123";
  const char MQTT_PASSWORD[] = "GeoCatFeeder2026";
#else
  // broker.emqx.io: public broker, no auth on port 1883
  const char MQTT_BROKER[]   = "broker.emqx.io";
  const int  MQTT_PORT       = 1883;
  const char MQTT_USERNAME[] = "";
  const char MQTT_PASSWORD[] = "";
#endif

// Client ID is made unique per-boot by appending millis() in setup()
char MQTT_CLIENT_ID[40] = "smartcat-uno-";

// ── Servo ─────────────────────────────────────────────────────────────────────
const int SERVO_PIN        = 9;    // PWM pin — orange/yellow servo wire
const int CLOSED_ANGLE     = 0;    // Hopper sealed position (degrees)
const int OPEN_ANGLE       = 160;  // Hopper open position — tune to your build
const int DEFAULT_DURATION = 2000; // Default open duration (ms) if not set in dashboard

// ── Timing ────────────────────────────────────────────────────────────────────
const unsigned long HEARTBEAT_INTERVAL_MS = 30000;   // 30 s
const unsigned long DUPLICATE_WINDOW_MS   = 30000;   // ignore same requestId for 30 s
const unsigned long MQTT_RETRY_INTERVAL   = 12000;   // retry MQTT connect every 12 s

// =============================================================================
//  MQTT Topic Strings  (built in setup() from MQTT_USERNAME)
// =============================================================================
String TOPIC_COMMAND;
String TOPIC_RESPONSE;
String TOPIC_HEARTBEAT;
String TOPIC_ERROR;
String TOPIC_STATUS;

// =============================================================================
//  Global State
// =============================================================================
#if USE_TLS
  WiFiSSLClient wifiClient;
#else
  WiFiClient    wifiClient;
#endif

PubSubClient mqttClient(wifiClient);
Servo      feederServo;

unsigned long lastHeartbeatMs   = 0;
unsigned long deviceUptimeStart = 0;
unsigned long lastMqttRetryMs   = 0;
bool          mqttConnected     = false;
bool          isDispensing      = false;  // guard: block reconnects during dispense

// Dedup tracking
String        lastRequestId    = "";
unsigned long lastRequestTimeMs = 0;

// =============================================================================
//  Forward Declarations
// =============================================================================
void connectWiFi();
void connectMQTT();
void onMqttMessage(char* topic, byte* payload, unsigned int length);
void handleCommand(const String& payload);
void dispenseFood(const String& requestId, int portion, int durationMs);
void publishResponse(const String& requestId, bool success, const String& message, unsigned long durationMs = 0);
void publishHeartbeat();
void publishStatus(const String& status);
void publishError(const String& errorMsg);
String getIsoTimestamp();

// =============================================================================
//  Setup
// =============================================================================
void setup() {
  Serial.begin(115200);
  delay(1500);
  Serial.println(F("=============================================="));
  Serial.println(F("  SmartCat Feeder - Arduino UNO R4 WiFi"));
  Serial.println(F("=============================================="));

  Serial.print(F("MQTT Client ID base: ")); Serial.println(MQTT_CLIENT_ID);

  // Build topic strings — fixed namespace "geo123" isolates from other public broker users
  String prefix = String("smartcat/geo123/device/");
  TOPIC_COMMAND   = prefix + "command";
  TOPIC_RESPONSE  = prefix + "response";
  TOPIC_HEARTBEAT = prefix + "heartbeat";
  TOPIC_ERROR     = prefix + "error";
  TOPIC_STATUS    = prefix + "status";

  Serial.print(F("Command topic : ")); Serial.println(TOPIC_COMMAND);
  
  Serial.setTimeout(50); // Prevent Serial.readStringUntil from blocking for 1 second

  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(onMqttMessage);

  // Servo startup test — verifies wiring and position
  Serial.println(F("Servo self-test..."));
  feederServo.attach(SERVO_PIN);
  feederServo.write(CLOSED_ANGLE);
  delay(400);
  feederServo.write(OPEN_ANGLE);
  delay(500);
  feederServo.write(CLOSED_ANGLE);
  delay(400);
  feederServo.detach();   // detach when idle to prevent jitter / PWM conflict
  Serial.println(F("Servo self-test complete. Servo detached (idle)."));

  // Connect WiFi then MQTT
  connectWiFi();
  deviceUptimeStart = millis();
}

// =============================================================================
//  Main Loop
// =============================================================================
void loop() {
  // ── 1. While dispensing, do nothing else (servo needs clean timing) ──────
  if (isDispensing) return;

  // ── 2. Poll for incoming messages first so internal connection status is updated ──
  mqttClient.loop();

  // ── 3. WiFi watchdog ──────────────────────────────────────────────────────
  if (WiFi.status() != WL_CONNECTED || WiFi.localIP() == IPAddress(0,0,0,0)) {
    Serial.println(F("[WiFi] Lost connection. Reconnecting..."));
    connectWiFi();
  }

  // ── 4. MQTT watchdog (rate-limited to avoid broker flooding) ─────────────
  if (!mqttConnected) {
    unsigned long now = millis();
    if (now - lastMqttRetryMs >= MQTT_RETRY_INTERVAL) {
      lastMqttRetryMs = now;
      connectMQTT();
      // After a successful connect, force a long grace period before next check
      if (mqttConnected) {
        lastMqttRetryMs = millis(); // reset timer after success
      }
    }
  } else {
    // Check if broker disconnected us (keepalive failure etc.)
    if (!mqttClient.connected()) {
      mqttConnected = false;
      Serial.print(F("[MQTT] Lost connection. MQTT connected: "));
      Serial.print(mqttClient.connected());
      Serial.print(F(", TCP connected: "));
      Serial.print(wifiClient.connected());
      Serial.print(F(", WiFi status: "));
      Serial.println(WiFi.status());
      wifiClient.stop(); // Clean up socket immediately
    }
  }

  // ── 5. Heartbeat ──────────────────────────────────────────────────────────
  unsigned long now = millis();
  if (now - lastHeartbeatMs >= HEARTBEAT_INTERVAL_MS) {
    publishHeartbeat();
    lastHeartbeatMs = now;
  }

  // ── 6. Serial test mode (type "feed" in Serial Monitor) ──────────────────
  if (Serial.available() > 0) {
    String input = Serial.readStringUntil('\n');
    input.trim();
    if (input.equalsIgnoreCase("feed")) {
      Serial.println(F("[SERIAL] Manual feed triggered"));
      dispenseFood("serial-test", 1, DEFAULT_DURATION);
    } else {
      Serial.println(F("[SERIAL] Type 'feed' to test servo"));
    }
  }
}

// =============================================================================
//  WiFi Connection
// =============================================================================
void connectWiFi() {
  Serial.print(F("[WiFi] Connecting to: "));
  Serial.println(WIFI_SSID);

  WiFi.disconnect();
  delay(500);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while ((WiFi.status() != WL_CONNECTED || WiFi.localIP() == IPAddress(0,0,0,0)) && attempts < 30) {
    delay(1000);
    Serial.print('.');
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED && WiFi.localIP() != IPAddress(0,0,0,0)) {
    Serial.println();
    Serial.print(F("[WiFi] Connected! IP: ")); Serial.println(WiFi.localIP());
    Serial.print(F("[WiFi] RSSI: "));         Serial.print(WiFi.RSSI()); Serial.println(F(" dBm"));

    #if USE_TLS
      Serial.print(F("[NTP] Syncing time..."));
      unsigned long t0 = millis();
      while (WiFi.getTime() < 1700000000UL && millis() - t0 < 15000) {
        delay(1000); Serial.print('.');
      }
      if (WiFi.getTime() >= 1700000000UL) {
        Serial.println(F("\n[NTP] Synchronized"));
      } else {
        Serial.println(F("\n[NTP] Timeout — TLS may fail"));
      }
    #else
      Serial.println(F("[NTP] Skipped (TLS disabled)"));
    #endif

    connectMQTT();
  } else {
    Serial.println(F("\n[WiFi] FAILED. Will retry in loop."));
  }
}

// =============================================================================
//  MQTT Connection
// =============================================================================
void connectMQTT() {
  if (WiFi.status() != WL_CONNECTED) return;

  // Clean up any existing socket resources to prevent ESP32 socket leaks
  wifiClient.stop();
  delay(100);

  Serial.print(F("[MQTT] Connecting to "));
  Serial.print(MQTT_BROKER); Serial.print(':'); Serial.println(MQTT_PORT);

  #if USE_TLS
    wifiClient.setCACert(nullptr);  // use built-in root CA bundle
  #endif

  char currentClientId[40];
  randomSeed(analogRead(0));
  long randVal = random(100000, 999999);
  snprintf(currentClientId, sizeof(currentClientId), "smartcat-uno-%ld", randVal);
  Serial.print(F("[MQTT] Client ID: ")); Serial.println(currentClientId);

  // Single attempt
  bool connected = false;
  #if USE_TLS
    connected = mqttClient.connect(currentClientId, MQTT_USERNAME, MQTT_PASSWORD);
  #else
    connected = mqttClient.connect(currentClientId);
  #endif

  if (!connected) {
    Serial.print(F("[MQTT] Connect failed, state: "));
    Serial.println(mqttClient.state());
    return;
  }

  mqttConnected = true;
  Serial.println(F("[MQTT] ✅ Connected!"));

  mqttClient.subscribe(TOPIC_COMMAND.c_str());
  Serial.print(F("[MQTT] Subscribed to: ")); Serial.println(TOPIC_COMMAND);
}

// =============================================================================
//  MQTT Message Callback
// =============================================================================
void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  String topicStr = String(topic);
  String payloadStr = "";
  for (unsigned int i = 0; i < length; i++) {
    payloadStr += (char)payload[i];
  }

  Serial.print(F("[MQTT] RX [")); Serial.print(topicStr); Serial.print(F("]: "));
  Serial.println(payloadStr);

  if (topicStr == TOPIC_COMMAND) {
    handleCommand(payloadStr);
  }
}

// =============================================================================
//  Command Handler
// =============================================================================
void handleCommand(const String& payload) {
  StaticJsonDocument<512> doc;
  if (deserializeJson(doc, payload)) {
    publishError("Invalid JSON payload");
    return;
  }

  const char* command   = doc["command"];
  const char* requestId = doc["requestId"];
  int portion           = doc["portion"]    | 1;
  int durationMs        = doc["durationMs"] | DEFAULT_DURATION;

  if (!command || !requestId) {
    publishError("Missing command or requestId");
    return;
  }

  // Deduplication
  unsigned long now = millis();
  if (String(requestId) == lastRequestId && (now - lastRequestTimeMs) < DUPLICATE_WINDOW_MS) {
    Serial.println(F("[CMD] Duplicate ignored"));
    return;
  }
  lastRequestId     = String(requestId);
  lastRequestTimeMs = now;

  if (String(command) == "feed") {
    Serial.println(F("[CMD] Feed command received"));
    dispenseFood(String(requestId), portion, durationMs);
  } else {
    Serial.print(F("[CMD] Unknown command: ")); Serial.println(command);
    publishResponse(String(requestId), false, "Unknown command");
  }
}

// =============================================================================
//  Dispense Food — Servo Control
//  isDispensing flag blocks all loop() networking during physical operation
// =============================================================================
void dispenseFood(const String& requestId, int portion, int durationMs) {
  isDispensing = true;
  unsigned long startMs = millis();

  // Clamp to sane range
  if (durationMs < 200)   durationMs = 200;
  if (durationMs > 15000) durationMs = 15000;

  long holdMs = (long)durationMs * portion;

  Serial.print(F("[SERVO] Attaching servo on pin ")); Serial.println(SERVO_PIN);
  feederServo.attach(SERVO_PIN);
  delay(200);  // let PWM stabilise

  Serial.print(F("[SERVO] Opening to ")); Serial.print(OPEN_ANGLE); Serial.println(F("°"));
  feederServo.write(OPEN_ANGLE);
  delay(holdMs);  // hold open

  Serial.print(F("[SERVO] Closing to ")); Serial.print(CLOSED_ANGLE); Serial.println(F("°"));
  feederServo.write(CLOSED_ANGLE);
  delay(600);  // ensure servo reaches closed position

  feederServo.detach();  // detach to prevent jitter when idle
  Serial.println(F("[SERVO] Detached (idle)"));

  unsigned long elapsed = millis() - startMs;
  Serial.print(F("[SERVO] Done in ")); Serial.print(elapsed); Serial.println(F(" ms"));

  isDispensing = false;

  // Reconnect MQTT if it dropped during dispense
  if (!mqttClient.connected()) {
    connectMQTT();
  }

  publishResponse(requestId, true, "Food dispensed", elapsed);
}

// =============================================================================
//  Publish: Response
// =============================================================================
void publishResponse(const String& requestId, bool success, const String& message, unsigned long durationMs) {
  if (!mqttClient.connected()) return;

  StaticJsonDocument<256> doc;
  doc["requestId"]  = requestId;
  doc["status"]     = success ? "success" : "failed";
  doc["message"]    = message;
  doc["servoAngle"] = OPEN_ANGLE;
  doc["durationMs"] = (int)durationMs;
  doc["createdAt"]  = getIsoTimestamp();

  String out;
  serializeJson(doc, out);

  mqttClient.publish(TOPIC_RESPONSE.c_str(), out.c_str());

  Serial.print(F("[MQTT] TX response: ")); Serial.println(out);
}

// =============================================================================
//  Publish: Heartbeat
// =============================================================================
void publishHeartbeat() {
  if (!mqttClient.connected()) return;

  unsigned long uptime = (millis() - deviceUptimeStart) / 1000;
  int rssi = WiFi.RSSI();

  StaticJsonDocument<192> doc;
  doc["status"]        = "online";
  doc["uptimeSeconds"] = (int)uptime;
  doc["wifiStrength"]  = rssi;
  doc["createdAt"]     = getIsoTimestamp();

  String out;
  serializeJson(doc, out);

  mqttClient.publish(TOPIC_HEARTBEAT.c_str(), out.c_str());

  Serial.print(F("[MQTT] Heartbeat: uptime="));
  Serial.print(uptime); Serial.print(F("s, RSSI="));
  Serial.print(rssi); Serial.println(F("dBm"));
}

// =============================================================================
//  Publish: Status
// =============================================================================
void publishStatus(const String& status) {
  if (!mqttClient.connected()) return;

  StaticJsonDocument<128> doc;
  doc["status"]    = status;
  doc["createdAt"] = getIsoTimestamp();

  String out;
  serializeJson(doc, out);

  mqttClient.publish(TOPIC_STATUS.c_str(), out.c_str());
}

// =============================================================================
//  Publish: Error
// =============================================================================
void publishError(const String& errorMsg) {
  if (!mqttClient.connected()) return;

  StaticJsonDocument<128> doc;
  doc["error"]     = errorMsg;
  doc["createdAt"] = getIsoTimestamp();

  String out;
  serializeJson(doc, out);

  mqttClient.publish(TOPIC_ERROR.c_str(), out.c_str());
}

// =============================================================================
//  Helper: Uptime-based timestamp
// =============================================================================
String getIsoTimestamp() {
  unsigned long ms = millis();
  unsigned long s  = ms / 1000;
  unsigned long m  = s  / 60;
  unsigned long h  = m  / 60;
  char buf[28];
  snprintf(buf, sizeof(buf), "T+%02lu:%02lu:%02lu.%03lu", h, m % 60, s % 60, ms % 1000);
  return String(buf);
}
