/*
 * =============================================================================
 *  SmartCat Feeder - Arduino UNO R4 WiFi Firmware  v2.1
 * =============================================================================
 *  Hardware  : Arduino UNO R4 WiFi
 *  Libraries : WiFiS3, PubSubClient, Servo, ArduinoJson, Arduino_LED_Matrix
 *
 *  Wiring (SG90 / MG995 Servo):
 *    Brown / Black wire  → GND
 *    Red wire            → 5V  (external power supply recommended)
 *    Orange / Yellow     → D9  (PWM signal pin)
 *
 *  LED Matrix Status Codes (built-in 12×8 matrix on UNO R4 WiFi):
 *    Startup          : spinning / scanning animation
 *    WiFi Connecting  : wave sweep left→right
 *    WiFi Connected   : solid checkmark frame
 *    WiFi Failed      : "X" / cross frame
 *    MQTT Connecting  : blinking dots (3-dot row)
 *    MQTT Connected   : full smile / happy face
 *    MQTT Failed      : sad face
 *    Dispensing       : downward arrow animation
 *    Heartbeat ping   : brief single-row flash
 *    Simultaneous blk : flashing warning bars
 * =============================================================================
 */

#include <WiFiS3.h>
#include <PubSubClient.h>
#include <Servo.h>
#include <ArduinoJson.h>
#include <Arduino_LED_Matrix.h>

ArduinoLEDMatrix matrix;

// =============================================================================
//  ⚙️  USER CONFIGURATION — Change only these values
// =============================================================================

char WIFI_SSID[]     = "Mullananickal KvFi";
char WIFI_PASSWORD[] = "geo@6756";

// ── MQTT ──────────────────────────────────────────────────────────────────────
#define USE_TLS false

#if USE_TLS
  const char MQTT_BROKER[] = "1929ae9bc33d4ba29b4aa4f909c3ef85.s1.eu.hivemq.cloud";
  const int  MQTT_PORT     = 8883;
  const char MQTT_USERNAME[] = "geo123";
  const char MQTT_PASSWORD[] = "GeoCatFeeder2026";
#else
  const char MQTT_BROKER[]   = "broker.emqx.io";
  const int  MQTT_PORT       = 1883;
  const char MQTT_USERNAME[] = "";
  const char MQTT_PASSWORD[] = "";
#endif

char MQTT_CLIENT_ID[40] = "smartcat-uno-";

// ── Servo ─────────────────────────────────────────────────────────────────────
const int SERVO_PIN        = 9;
const int CLOSED_ANGLE     = 0;
const int OPEN_ANGLE       = 160;
const int DEFAULT_DURATION = 2000;

// ── Timing ────────────────────────────────────────────────────────────────────
const unsigned long HEARTBEAT_INTERVAL_MS = 25000;   // 25s (below 90s server timeout)
const unsigned long DUPLICATE_WINDOW_MS   = 30000;
const unsigned long MQTT_RETRY_INTERVAL   = 8000;    // retry every 8s (faster)
const unsigned long WIFI_CHECK_INTERVAL   = 15000;   // check WiFi every 15s

// =============================================================================
//  LED Matrix Frames — uint8_t[8][12]  (8 rows × 12 cols, 1=ON, 0=OFF)
//  Row 0 = top, Row 7 = bottom. Col 0 = left, Col 11 = right.
// =============================================================================

// ── IDLE (all off) ─────────────────────────────────────────────────────────────
uint8_t FRAME_IDLE[8][12] = {
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0},
};

// ── WiFi CONNECTING (builds up like a signal meter — 3 arcs + dot) ─────────────
// Frame A: just center dot
uint8_t FRAME_WIFI_A[8][12] = {
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,1,0,0,0,0,0,0},   // dot
};
// Frame B: dot + inner arc
uint8_t FRAME_WIFI_B[8][12] = {
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,1,1,1,0,0,0,0,0},   // inner arc
  {0,0,0,1,0,0,0,1,0,0,0,0},
  {0,0,0,0,0,1,0,0,0,0,0,0},   // dot
};
// Frame C: dot + inner + middle arc
uint8_t FRAME_WIFI_C[8][12] = {
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,1,1,1,1,1,0,0,0,0},   // middle arc
  {0,0,1,0,0,0,0,0,1,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,1,1,1,0,0,0,0,0},   // inner arc
  {0,0,0,1,0,0,0,1,0,0,0,0},
  {0,0,0,0,0,1,0,0,0,0,0,0},   // dot
};

// ── WiFi CONNECTED (full 3-arc signal + dot) ────────────────────────────────────
uint8_t FRAME_WIFI_OK[8][12] = {
  {0,1,1,1,1,1,1,1,1,1,0,0},   // outer arc
  {1,0,0,0,0,0,0,0,0,0,1,0},
  {0,0,0,1,1,1,1,1,0,0,0,0},   // middle arc
  {0,0,1,0,0,0,0,0,1,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,1,1,1,0,0,0,0,0},   // inner arc
  {0,0,0,1,0,0,0,1,0,0,0,0},
  {0,0,0,0,0,1,0,0,0,0,0,0},   // center dot
};

// ── WiFi FAILED (bold X) ────────────────────────────────────────────────────────
uint8_t FRAME_WIFI_FAIL[8][12] = {
  {1,0,0,0,0,0,0,0,0,0,1,0},
  {0,1,0,0,0,0,0,0,0,1,0,0},
  {0,0,1,0,0,0,0,0,1,0,0,0},
  {0,0,0,1,0,0,0,1,0,0,0,0},
  {0,0,0,0,1,0,1,0,0,0,0,0},
  {0,0,0,1,0,0,0,1,0,0,0,0},
  {0,0,1,0,0,0,0,0,1,0,0,0},
  {0,1,0,0,0,0,0,0,0,1,0,0},
};

// ── MQTT CONNECTING (3 blinking dots in centre row) ─────────────────────────────
uint8_t FRAME_MQTT_DOTS[8][12] = {
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,1,0,0,0,0,0,0,0,0,0},   // dot 1
  {0,0,0,0,0,1,0,0,0,0,0,0},   // dot 2 (centre)
  {0,0,0,0,0,0,0,0,1,0,0,0},   // dot 3
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0},
};

// ── MQTT CONNECTED (smiley face) ────────────────────────────────────────────────
uint8_t FRAME_MQTT_OK[8][12] = {
  {0,0,0,1,1,1,1,1,0,0,0,0},   // top of circle
  {0,0,1,0,0,0,0,0,1,0,0,0},
  {0,1,0,1,0,0,0,1,0,1,0,0},   // eyes
  {0,1,0,0,0,0,0,0,0,1,0,0},
  {0,1,0,1,0,0,0,1,0,1,0,0},   // smile corners
  {0,0,1,0,1,1,1,0,1,0,0,0},   // smile curve
  {0,0,0,1,0,0,0,1,0,0,0,0},
  {0,0,0,0,1,1,1,0,0,0,0,0},   // chin
};

// ── MQTT FAILED (sad face) ──────────────────────────────────────────────────────
uint8_t FRAME_MQTT_FAIL[8][12] = {
  {0,0,0,1,1,1,1,1,0,0,0,0},
  {0,0,1,0,0,0,0,0,1,0,0,0},
  {0,1,0,1,0,0,0,1,0,1,0,0},   // eyes
  {0,1,0,0,0,0,0,0,0,1,0,0},
  {0,1,0,0,1,1,1,0,0,1,0,0},   // sad mouth (flat/frown)
  {0,0,1,1,0,0,0,1,1,0,0,0},   // frown curves down
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0},
};

// ── DISPENSING — Frame A (arrow shaft + full arrowhead) ─────────────────────────
uint8_t FRAME_DISP_A[8][12] = {
  {0,0,0,0,0,1,0,0,0,0,0,0},   // shaft top
  {0,0,0,0,0,1,0,0,0,0,0,0},
  {0,0,0,0,0,1,0,0,0,0,0,0},
  {0,0,0,0,0,1,0,0,0,0,0,0},
  {1,1,1,1,1,1,1,1,1,1,0,0},   // arrowhead wide row
  {0,1,1,1,1,1,1,1,1,0,0,0},
  {0,0,1,1,1,1,1,1,0,0,0,0},
  {0,0,0,1,1,1,1,0,0,0,0,0},   // tip
};
// Frame B (shaft only — alternates to animate) ───────────────────────────────────
uint8_t FRAME_DISP_B[8][12] = {
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,1,0,0,0,0,0,0},   // shaft (offset)
  {0,0,0,0,0,1,0,0,0,0,0,0},
  {0,0,0,0,0,1,0,0,0,0,0,0},
  {0,1,1,1,1,1,1,1,1,0,0,0},   // smaller head
  {0,0,1,1,1,1,1,1,0,0,0,0},
  {0,0,0,1,1,1,1,0,0,0,0,0},
  {0,0,0,0,1,1,0,0,0,0,0,0},   // tip
};

// ── HEARTBEAT (two solid centre rows, quick flash) ───────────────────────────────
uint8_t FRAME_HEARTBEAT[8][12] = {
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {1,1,1,1,1,1,1,1,1,1,1,1},   // solid rows
  {1,1,1,1,1,1,1,1,1,1,1,1},
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0},
};

// ── BLOCKED / busy (alternating horizontal stripes — unmistakable warning) ──────
uint8_t FRAME_BLOCKED[8][12] = {
  {1,1,1,1,1,1,1,1,1,1,1,1},
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {1,1,1,1,1,1,1,1,1,1,1,1},
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {1,1,1,1,1,1,1,1,1,1,1,1},
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {1,1,1,1,1,1,1,1,1,1,1,1},
  {0,0,0,0,0,0,0,0,0,0,0,0},
};

// ── CHECKMARK (large, diagonal ✓) ───────────────────────────────────────────────
uint8_t FRAME_CHECK[8][12] = {
  {0,0,0,0,0,0,0,0,0,0,1,0},
  {0,0,0,0,0,0,0,0,0,1,0,0},
  {0,0,0,0,0,0,0,0,1,0,0,0},
  {0,0,0,0,0,0,0,1,0,0,0,0},
  {1,0,0,0,0,0,1,0,0,0,0,0},
  {0,1,0,0,0,1,0,0,0,0,0,0},
  {0,0,1,0,1,0,0,0,0,0,0,0},
  {0,0,0,1,0,0,0,0,0,0,0,0},
};

// =============================================================================
//  LED Helpers
// =============================================================================
void showFrame(uint8_t frame[8][12]) {
  matrix.loadFrame(frame);
}

void blinkFrame(uint8_t frame[8][12], int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    matrix.loadFrame(frame);
    delay(delayMs);
    matrix.loadFrame(FRAME_IDLE);
    delay(delayMs);
  }
}


// =============================================================================
//  MQTT Topic Strings  (built in setup())
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
Servo        feederServo;

unsigned long lastHeartbeatMs   = 0;
unsigned long deviceUptimeStart = 0;
unsigned long lastMqttRetryMs   = 0;
unsigned long lastWifiCheckMs   = 0;
bool          mqttConnected     = false;

// ── Dispensing lock — prevents simultaneous feeds ─────────────────────────────
volatile bool isDispensing = false;

// Dedup tracking
String        lastRequestId     = "";
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
void startupAnimation();

// =============================================================================
//  Startup Animation
// =============================================================================
void startupAnimation() {
  // Boot sequence: WiFi signal builds up A→B→C→full, then clears
  showFrame(FRAME_WIFI_A); delay(150);
  showFrame(FRAME_WIFI_B); delay(150);
  showFrame(FRAME_WIFI_C); delay(150);
  showFrame(FRAME_WIFI_OK); delay(300);
  showFrame(FRAME_IDLE);   delay(100);
  showFrame(FRAME_WIFI_OK); delay(200);
  showFrame(FRAME_IDLE);
}

// =============================================================================
//  Setup
// =============================================================================
void setup() {
  Serial.begin(115200);
  delay(1200);

  // Start LED matrix
  matrix.begin();
  startupAnimation();

  Serial.println(F("=============================================="));
  Serial.println(F("  SmartCat Feeder - Arduino UNO R4 WiFi v2.1"));
  Serial.println(F("=============================================="));

  // Build topic strings
  String prefix = String("smartcat/geo123/device/");
  TOPIC_COMMAND   = prefix + "command";
  TOPIC_RESPONSE  = prefix + "response";
  TOPIC_HEARTBEAT = prefix + "heartbeat";
  TOPIC_ERROR     = prefix + "error";
  TOPIC_STATUS    = prefix + "status";

  Serial.print(F("Command topic : ")); Serial.println(TOPIC_COMMAND);
  Serial.setTimeout(50);

  // Configure MQTT with faster keepalive
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(onMqttMessage);
  mqttClient.setKeepAlive(15);     // 15s keepalive → server detects drops faster
  mqttClient.setSocketTimeout(8);  // 8s socket timeout

  // Servo self-test
  Serial.println(F("Servo self-test..."));
  feederServo.attach(SERVO_PIN);
  feederServo.write(CLOSED_ANGLE);
  delay(300);
  feederServo.write(OPEN_ANGLE);
  delay(400);
  feederServo.write(CLOSED_ANGLE);
  delay(300);
  feederServo.detach();
  Serial.println(F("Servo self-test done. Servo detached."));

  connectWiFi();
  deviceUptimeStart = millis();
}

// =============================================================================
//  Main Loop
// =============================================================================
void loop() {
  // While dispensing: just keep MQTT alive minimally, don't reconnect
  if (isDispensing) {
    mqttClient.loop();
    return;
  }

  // Poll incoming messages
  mqttClient.loop();

  unsigned long now = millis();

  // ── WiFi watchdog (check every 15s) ──────────────────────────────────────
  if (now - lastWifiCheckMs >= WIFI_CHECK_INTERVAL) {
    lastWifiCheckMs = now;
    if (WiFi.status() != WL_CONNECTED || WiFi.localIP() == IPAddress(0, 0, 0, 0)) {
      Serial.println(F("[WiFi] Lost. Reconnecting..."));
      mqttConnected = false;
      connectWiFi();
    }
  }

  // ── MQTT watchdog ─────────────────────────────────────────────────────────
  if (!mqttConnected || !mqttClient.connected()) {
    mqttConnected = false;
    if (now - lastMqttRetryMs >= MQTT_RETRY_INTERVAL) {
      lastMqttRetryMs = now;
      if (WiFi.status() == WL_CONNECTED) {
        wifiClient.stop();
        delay(50);
        connectMQTT();
      }
    }
  }

  // ── Heartbeat ────────────────────────────────────────────────────────────
  if (now - lastHeartbeatMs >= HEARTBEAT_INTERVAL_MS) {
    publishHeartbeat();
    lastHeartbeatMs = now;
    // Brief heartbeat flash on matrix
    blinkFrame(FRAME_HEARTBEAT, 1, 60);
    showFrame(mqttConnected ? FRAME_MQTT_OK : FRAME_IDLE);
  }

  // ── Serial test mode ─────────────────────────────────────────────────────
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
  Serial.print(F("[WiFi] Connecting to: ")); Serial.println(WIFI_SSID);

  // Show WiFi connecting animation — signal bars building up
  showFrame(FRAME_WIFI_A);

  WiFi.disconnect();
  delay(300);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while ((WiFi.status() != WL_CONNECTED || WiFi.localIP() == IPAddress(0, 0, 0, 0)) && attempts < 30) {
    delay(1000);
    Serial.print('.');
    attempts++;
    // Cycle through 3 signal-building frames
    if      (attempts % 3 == 0) showFrame(FRAME_WIFI_C);
    else if (attempts % 3 == 1) showFrame(FRAME_WIFI_A);
    else                        showFrame(FRAME_WIFI_B);
  }

  if (WiFi.status() == WL_CONNECTED && WiFi.localIP() != IPAddress(0, 0, 0, 0)) {
    Serial.println();
    Serial.print(F("[WiFi] ✅ Connected! IP: ")); Serial.println(WiFi.localIP());
    Serial.print(F("[WiFi] RSSI: ")); Serial.print(WiFi.RSSI()); Serial.println(F(" dBm"));

    // Show "connected" checkmark for 1s
    showFrame(FRAME_WIFI_OK);
    delay(1000);

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
    blinkFrame(FRAME_WIFI_FAIL, 3, 200);
    showFrame(FRAME_IDLE);
  }
}

// =============================================================================
//  MQTT Connection
// =============================================================================
void connectMQTT() {
  if (WiFi.status() != WL_CONNECTED) return;

  Serial.print(F("[MQTT] Connecting to "));
  Serial.print(MQTT_BROKER); Serial.print(':'); Serial.println(MQTT_PORT);

  showFrame(FRAME_MQTT_DOTS);

  #if USE_TLS
    wifiClient.setCACert(nullptr);
  #endif

  char currentClientId[44];
  randomSeed(analogRead(A0) ^ millis());
  long randVal = random(100000, 999999);
  snprintf(currentClientId, sizeof(currentClientId), "smartcat-uno-%ld", randVal);
  Serial.print(F("[MQTT] Client ID: ")); Serial.println(currentClientId);

  bool connected = false;
  #if USE_TLS
    connected = mqttClient.connect(currentClientId, MQTT_USERNAME, MQTT_PASSWORD);
  #else
    connected = mqttClient.connect(currentClientId);
  #endif

  if (!connected) {
    int state = mqttClient.state();
    Serial.print(F("[MQTT] ❌ Connect failed, state: ")); Serial.println(state);
    blinkFrame(FRAME_MQTT_FAIL, 2, 180);
    showFrame(FRAME_IDLE);
    return;
  }

  mqttConnected = true;
  Serial.println(F("[MQTT] ✅ Connected!"));

  mqttClient.subscribe(TOPIC_COMMAND.c_str(), 1);  // QoS 1
  Serial.print(F("[MQTT] Subscribed to: ")); Serial.println(TOPIC_COMMAND);

  // Publish that device is online
  publishStatus("online");

  // Immediately publish a heartbeat so the backend marks device ONLINE right away
  // (especially important after external power reconnection)
  publishHeartbeat();
  lastHeartbeatMs = millis();  // reset timer so we don't double-heartbeat immediately

  showFrame(FRAME_MQTT_OK);
  delay(800);
  showFrame(FRAME_IDLE);
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

  // ── Simultaneous feed guard ────────────────────────────────────────────────
  if (isDispensing) {
    Serial.println(F("[CMD] ⚠️  Rejected: already dispensing!"));
    blinkFrame(FRAME_BLOCKED, 3, 150);
    showFrame(FRAME_DISP_A);

    // Publish rejection response so the backend resolves the pending promise
    StaticJsonDocument<256> reject;
    reject["requestId"] = requestId;
    reject["status"]    = "failed";
    reject["message"]   = "Device busy: already dispensing";
    reject["createdAt"] = getIsoTimestamp();
    String rejectOut;
    serializeJson(reject, rejectOut);
    mqttClient.publish(TOPIC_RESPONSE.c_str(), rejectOut.c_str());
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
// =============================================================================
void dispenseFood(const String& requestId, int portion, int durationMs) {
  isDispensing = true;
  unsigned long startMs = millis();

  // Clamp duration
  if (durationMs < 200)   durationMs = 200;
  if (durationMs > 15000) durationMs = 15000;

  long holdMs = (long)durationMs * portion;

  // Show dispensing animation on LED
  showFrame(FRAME_DISP_A);

  Serial.print(F("[SERVO] Attaching on pin ")); Serial.println(SERVO_PIN);
  feederServo.attach(SERVO_PIN);
  delay(150);

  Serial.print(F("[SERVO] Opening to ")); Serial.print(OPEN_ANGLE); Serial.println(F("°"));
  feederServo.write(OPEN_ANGLE);

  // Animate downward arrow while holding open
  unsigned long holdStart = millis();
  bool frameToggle = false;
  while (millis() - holdStart < (unsigned long)holdMs) {
    showFrame(frameToggle ? FRAME_DISP_B : FRAME_DISP_A);
    frameToggle = !frameToggle;
    // Keep MQTT alive during long dispenses
    mqttClient.loop();
    delay(250);
  }

  Serial.print(F("[SERVO] Closing to ")); Serial.print(CLOSED_ANGLE); Serial.println(F("°"));
  feederServo.write(CLOSED_ANGLE);
  delay(500);

  feederServo.detach();
  Serial.println(F("[SERVO] Detached (idle)"));

  unsigned long elapsed = millis() - startMs;
  Serial.print(F("[SERVO] Done in ")); Serial.print(elapsed); Serial.println(F(" ms"));

  isDispensing = false;

  // Show MQTT connected state again
  showFrame(FRAME_MQTT_OK);
  delay(600);
  showFrame(FRAME_IDLE);

  // Reconnect MQTT if it dropped during dispense
  if (!mqttClient.connected()) {
    mqttConnected = false;
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

  mqttClient.publish(TOPIC_RESPONSE.c_str(), out.c_str(), false);  // QoS 0 for speed
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
