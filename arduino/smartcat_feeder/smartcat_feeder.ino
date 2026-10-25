/*
 * =============================================================================
 *  SmartCat Feeder - Arduino UNO R4 WiFi Firmware  v2.1
 * =============================================================================
 *  Hardware : Arduino UNO R4 WiFi
 *  Libraries: WiFiS3, PubSubClient, Servo, ArduinoJson, Arduino_LED_Matrix
 *
 *  HOW TO USE:
 *    1. Fill in your Wi-Fi SSID and password below.
 *    2. Set MQTT_TOPIC_NAMESPACE to match your backend env var MQTT_TOPIC_NAMESPACE.
 *    3. Flash to your UNO R4 WiFi board via Arduino IDE.
 *    4. Open Serial Monitor at 115200 baud to watch connection logs.
 *
 *  MQTT Broker: broker.hivemq.com (public, no auth, no TLS required)
 * =============================================================================
 */

#include <WiFiS3.h>
#include <WiFiSSLClient.h>
#include <RTC.h>
#define MQTT_MAX_PACKET_SIZE 512
#include <PubSubClient.h>
#include <Servo.h>
#include <ArduinoJson.h>
#include <Arduino_LED_Matrix.h>

ArduinoLEDMatrix matrix;

// =============================================================================
//  ⚙️  USER CONFIGURATION — Fill in your values
// =============================================================================

char WIFI_SSID[]     = "YOUR_WIFI_SSID";
char WIFI_PASSWORD[] = "YOUR_WIFI_PASSWORD";

// ── MQTT ──────────────────────────────────────────────────────────────────────
#define USE_TLS true

#if USE_TLS
  const char MQTT_BROKER[]   = "1929ae9bc33d4ba29b4aa4f909c3ef85.s1.eu.hivemq.cloud";
  const int  MQTT_PORT       = 8883;
  const char MQTT_USERNAME[] = "geo123";
  const char MQTT_PASSWORD[] = "GeoCatFeeder2026";

  // ISRG Root X1 CA Certificate (Valid 2015-2035) for HiveMQ Cloud TLS verification
  const char HIVEMQ_ROOT_CA[] = \
"-----BEGIN CERTIFICATE-----\n" \
"MIIFazCCA1OgAwIBAgIRAIIQz7DSQONZRGPgu2OCiwAwDQYJKoZIhvcNAQELBQAw\n" \
"TzELMAkGA1UEBhMCVVMxKTAnBgNVBAoTIEludGVybmV0IFNlY3VyaXR5IFJlc2Vh\n" \
"cmNoIEdyb3VwMRUwEwYDVQQDEwxJU1JHIFJvb3QgWDEwHhcNMTUwNjA0MTEwNDM4\n" \
"WhcNMzUwNjA0MTEwNDM4WjBPMQswCQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJu\n" \
"ZXQgU2VjdXJpdHkgUmVzZWFyY2ggR3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBY\n" \
"MTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBAK3oJHP0FDfzm54rVygc\n" \
"h77ct984kIxuPOZXoHj3dcKi/vVqbvYATyjb3miGbESTtrFj/RQSa78f0uoxmyF+\n" \
"0TM8ukj13Xnfs7j/EvEhmkvBioZxaUpmZmyPfjxwv60pIgbz5MDmgK7iS4+3mX6U\n" \
"A5/TR5d8S5JlCdGwR6WCYU+58at6/hGw3g87bZnzo5JKnB7BlastpdEpKAsLxsYS\n" \
"IA280JUZZiMM5c7iQRrQElcjLiRK3CfvhPtZdgi91Coltl3889/Xt8GxhSnN98Ef\n" \
"orj49YKeAbuNWnLeLYmm80DGPUTLjbL9wVXh5Gs5UrxTxrddJqSHemGd12+/d84v\n" \
"4ieNWWhstn1h9agREEyW4wEZ+FsfyBNmx5PVvc89gn5iUim8y+U+42hMpU5Ooxyq\n" \
"A772eG45//okeUV3ChYZqmlC8k3Fs0aESMzLltbvmaTV29tg6f4XhHrBQBs5LKVO\n" \
"i5vWWQSPC8Wk0zGWaS2Tx78ukEQUSWAybHxDgxNWK2CHEgqrijYehLhpMziapsBe\n" \
"38OGHKYcOAecdDea4WNMQNV5eJPidGVirGLxusPXuWvWZeUQHUSWVQIDAQABo0Iw\n" \
"QDAPBgNVHRMBAf8EBTADAQH/MA4GA1UdDwEB/wQEAwIBBjAdBgNVHQ4EFgQU5KNm\n" \
"XrWAnCB993r51Bm2GY9KUco=\n" \
"-----END CERTIFICATE-----\n";
#else
  const char MQTT_BROKER[]   = "broker.hivemq.com";
  const int  MQTT_PORT       = 1883;
  const char MQTT_USERNAME[] = "";
  const char MQTT_PASSWORD[] = "";
#endif

// ── Topic Namespace — must match backend MQTT_TOPIC_NAMESPACE env var ─────────
// Topics will be: smartcat/<namespace>/device/{command,response,heartbeat,...}
const char MQTT_TOPIC_NAMESPACE[] = "geo123";

// ── Servo ─────────────────────────────────────────────────────────────────────
const int SERVO_PIN        = 9;
const int CLOSED_ANGLE     = 0;
const int OPEN_ANGLE       = 90;       // 90° standard open (prevents mechanical binding/gear stall)
const int DEFAULT_DURATION = 2000;
const bool KEEP_SERVO_ATTACHED = true; // Prevents UNO R4 timer de-allocation bugs caused by repeated attach/detach

// ── Timing ────────────────────────────────────────────────────────────────────
const unsigned long HEARTBEAT_INTERVAL_MS = 25000;   // 25s (below 90s server timeout)
const unsigned long DUPLICATE_WINDOW_MS   = 30000;
const unsigned long MQTT_RETRY_INTERVAL   = 8000;    // retry every 8s
const unsigned long WIFI_CHECK_INTERVAL   = 15000;   // check WiFi every 15s

// =============================================================================
//  LED Matrix Frames — uint8_t[8][12]  (8 rows × 12 cols, 1=ON, 0=OFF)
// =============================================================================

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

uint8_t FRAME_WIFI_A[8][12] = {
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,1,0,0,0,0,0,0},
};

uint8_t FRAME_WIFI_B[8][12] = {
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,1,1,1,0,0,0,0,0},
  {0,0,0,1,0,0,0,1,0,0,0,0},
  {0,0,0,0,0,1,0,0,0,0,0,0},
};

uint8_t FRAME_WIFI_C[8][12] = {
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,1,1,1,1,1,0,0,0,0},
  {0,0,1,0,0,0,0,0,1,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,1,1,1,0,0,0,0,0},
  {0,0,0,1,0,0,0,1,0,0,0,0},
  {0,0,0,0,0,1,0,0,0,0,0,0},
};

uint8_t FRAME_WIFI_OK[8][12] = {
  {0,1,1,1,1,1,1,1,1,1,0,0},
  {1,0,0,0,0,0,0,0,0,0,1,0},
  {0,0,0,1,1,1,1,1,0,0,0,0},
  {0,0,1,0,0,0,0,0,1,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,1,1,1,0,0,0,0,0},
  {0,0,0,1,0,0,0,1,0,0,0,0},
  {0,0,0,0,0,1,0,0,0,0,0,0},
};

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

uint8_t FRAME_MQTT_DOTS[8][12] = {
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,1,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,1,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,1,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0},
};

uint8_t FRAME_MQTT_OK[8][12] = {
  {0,0,0,1,1,1,1,1,0,0,0,0},
  {0,0,1,0,0,0,0,0,1,0,0,0},
  {0,1,0,1,0,0,0,1,0,1,0,0},
  {0,1,0,0,0,0,0,0,0,1,0,0},
  {0,1,0,1,0,0,0,1,0,1,0,0},
  {0,0,1,0,1,1,1,0,1,0,0,0},
  {0,0,0,1,0,0,0,1,0,0,0,0},
  {0,0,0,0,1,1,1,0,0,0,0,0},
};

uint8_t FRAME_MQTT_FAIL[8][12] = {
  {0,0,0,1,1,1,1,1,0,0,0,0},
  {0,0,1,0,0,0,0,0,1,0,0,0},
  {0,1,0,1,0,0,0,1,0,1,0,0},
  {0,1,0,0,0,0,0,0,0,1,0,0},
  {0,1,0,0,1,1,1,0,0,1,0,0},
  {0,0,1,1,0,0,0,1,1,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0},
};

uint8_t FRAME_DISP_A[8][12] = {
  {0,0,0,0,0,1,0,0,0,0,0,0},
  {0,0,0,0,0,1,0,0,0,0,0,0},
  {0,0,0,0,0,1,0,0,0,0,0,0},
  {0,0,0,0,0,1,0,0,0,0,0,0},
  {1,1,1,1,1,1,1,1,1,1,0,0},
  {0,1,1,1,1,1,1,1,1,0,0,0},
  {0,0,1,1,1,1,1,1,0,0,0,0},
  {0,0,0,1,1,1,1,0,0,0,0,0},
};

uint8_t FRAME_HEARTBEAT[8][12] = {
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {1,1,1,1,1,1,1,1,1,1,1,1},
  {1,1,1,1,1,1,1,1,1,1,1,1},
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0},
};

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

void loadMatrix(uint8_t frame[8][12]) {
  uint32_t buf[3] = {0, 0, 0};
  for (int row = 0; row < 8; row++) {
    for (int col = 0; col < 12; col++) {
      if (frame[row][col]) {
        int flat = row * 12 + col;
        int word = flat / 32;
        int bit  = 31 - (flat % 32);
        buf[word] |= (1UL << bit);
      }
    }
  }
  matrix.loadFrame(buf);
}

void showFrame(uint8_t frame[8][12]) {
  loadMatrix(frame);
}

void blinkFrame(uint8_t frame[8][12], int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    loadMatrix(frame);
    delay(delayMs);
    loadMatrix(FRAME_IDLE);
    delay(delayMs);
  }
}

String TOPIC_COMMAND;
String TOPIC_RESPONSE;
String TOPIC_ACK;
String TOPIC_HEARTBEAT;
String TOPIC_ERROR;
String TOPIC_STATUS;

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

volatile bool isDispensing = false;
String        lastRequestId     = "";
unsigned long lastRequestTimeMs = 0;

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

void startupAnimation() {
  showFrame(FRAME_WIFI_A); delay(150);
  showFrame(FRAME_WIFI_B); delay(150);
  showFrame(FRAME_WIFI_C); delay(150);
  showFrame(FRAME_WIFI_OK); delay(300);
  showFrame(FRAME_IDLE);   delay(100);
  showFrame(FRAME_WIFI_OK); delay(200);
  showFrame(FRAME_IDLE);
}

void setup() {
  Serial.begin(115200);
  delay(1200);

  #if USE_TLS
    // Initialize RTC to 2024-2026 epoch so TLS certificate validity checks pass (2015-2035)
    RTC.begin();
    RTCTime startTime(1730000000UL);
    RTC.setTime(startTime);
  #endif

  matrix.begin();
  startupAnimation();

  Serial.println(F("=============================================="));
  Serial.println(F("  SmartCat Feeder - UNO R4 WiFi Firmware v2.1"));
  Serial.println(F("=============================================="));

  String prefix = String("smartcat/") + MQTT_TOPIC_NAMESPACE + "/device/";
  TOPIC_COMMAND   = prefix + "command";
  TOPIC_RESPONSE  = prefix + "response";
  TOPIC_ACK       = prefix + "ack";
  TOPIC_HEARTBEAT = prefix + "heartbeat";
  TOPIC_ERROR     = prefix + "error";
  TOPIC_STATUS    = prefix + "status";

  Serial.print(F("Command topic : ")); Serial.println(TOPIC_COMMAND);
  Serial.setTimeout(50);

  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setBufferSize(512);
  mqttClient.setCallback(onMqttMessage);
  mqttClient.setKeepAlive(15);
  mqttClient.setSocketTimeout(8);

  Serial.println(F("Servo initializing..."));
  feederServo.attach(SERVO_PIN, 544, 2400);
  feederServo.write(CLOSED_ANGLE);
  delay(300);
  Serial.println(F("Servo self-test sweep (0° -> 90° -> 0°)..."));
  feederServo.write(OPEN_ANGLE);
  delay(500);
  feederServo.write(CLOSED_ANGLE);
  delay(400);
  if (!KEEP_SERVO_ATTACHED) {
    feederServo.detach();
  }
  Serial.println(F("Servo self-test complete."));

  connectWiFi();
  deviceUptimeStart = millis();
}

void loop() {
  if (isDispensing) {
    mqttClient.loop();
    return;
  }

  mqttClient.loop();
  unsigned long now = millis();

  if (now - lastWifiCheckMs >= WIFI_CHECK_INTERVAL) {
    lastWifiCheckMs = now;
    if (WiFi.status() != WL_CONNECTED || WiFi.localIP() == IPAddress(0, 0, 0, 0)) {
      Serial.println(F("[WiFi] Lost. Reconnecting..."));
      mqttConnected = false;
      connectWiFi();
    }
  }

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

  if (now - lastHeartbeatMs >= HEARTBEAT_INTERVAL_MS) {
    publishHeartbeat();
    lastHeartbeatMs = now;
    blinkFrame(FRAME_HEARTBEAT, 1, 60);
    showFrame(mqttConnected ? FRAME_MQTT_OK : FRAME_IDLE);
  }

  if (Serial.available() > 0) {
    String input = Serial.readStringUntil('\n');
    input.trim();
    if (input.equalsIgnoreCase("feed")) {
      Serial.println(F("[SERIAL] Manual feed triggered"));
      dispenseFood("serial-test", 1, DEFAULT_DURATION);
    } else if (input.equalsIgnoreCase("test") || input.equalsIgnoreCase("sweep")) {
      Serial.println(F("[SERIAL] Sweeping servo: 0° -> 90° -> 160° -> 0°"));
      if (!feederServo.attached()) feederServo.attach(SERVO_PIN, 544, 2400);
      feederServo.write(0);   delay(800);
      feederServo.write(90);  delay(800);
      feederServo.write(160); delay(800);
      feederServo.write(0);   delay(800);
      Serial.println(F("[SERIAL] Sweep complete!"));
    } else if (input.equalsIgnoreCase("open")) {
      Serial.print(F("[SERIAL] Opening servo to ")); Serial.println(OPEN_ANGLE);
      if (!feederServo.attached()) feederServo.attach(SERVO_PIN, 544, 2400);
      feederServo.write(OPEN_ANGLE);
    } else if (input.equalsIgnoreCase("close")) {
      Serial.print(F("[SERIAL] Closing servo to ")); Serial.println(CLOSED_ANGLE);
      if (!feederServo.attached()) feederServo.attach(SERVO_PIN, 544, 2400);
      feederServo.write(CLOSED_ANGLE);
    } else if (input.startsWith("angle ") || input.startsWith("a ")) {
      int ang = input.substring(input.indexOf(' ') + 1).toInt();
      Serial.print(F("[SERIAL] Moving to angle: ")); Serial.println(ang);
      if (!feederServo.attached()) feederServo.attach(SERVO_PIN, 544, 2400);
      feederServo.write(ang);
    } else {
      Serial.println(F("[SERIAL] Commands: 'feed', 'test', 'open', 'close', 'angle <0-180>'"));
    }
  }
}

void connectWiFi() {
  Serial.print(F("[WiFi] Connecting to: ")); Serial.println(WIFI_SSID);
  showFrame(FRAME_WIFI_A);

  WiFi.disconnect();
  delay(300);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while ((WiFi.status() != WL_CONNECTED || WiFi.localIP() == IPAddress(0, 0, 0, 0)) && attempts < 30) {
    delay(1000);
    Serial.print('.');
    attempts++;
    if      (attempts % 3 == 0) showFrame(FRAME_WIFI_C);
    else if (attempts % 3 == 1) showFrame(FRAME_WIFI_A);
    else                        showFrame(FRAME_WIFI_B);
  }

  if (WiFi.status() == WL_CONNECTED && WiFi.localIP() != IPAddress(0, 0, 0, 0)) {
    Serial.println();
    Serial.print(F("[WiFi] ✅ Connected! IP: ")); Serial.println(WiFi.localIP());
    Serial.print(F("[WiFi] RSSI: ")); Serial.print(WiFi.RSSI()); Serial.println(F(" dBm"));
    showFrame(FRAME_WIFI_OK);
    delay(1000);

    #if USE_TLS
      unsigned long t0 = millis();
      while (WiFi.getTime() < 1700000000UL && millis() - t0 < 2000) {
        delay(250);
      }
    #endif

    connectMQTT();
  } else {
    Serial.println(F("\n[WiFi] FAILED. Will retry in loop."));
    blinkFrame(FRAME_WIFI_FAIL, 3, 200);
    showFrame(FRAME_IDLE);
  }
}

void connectMQTT() {
  if (WiFi.status() != WL_CONNECTED) return;

  Serial.print(F("[MQTT] Connecting to "));
  Serial.print(MQTT_BROKER); Serial.print(':'); Serial.println(MQTT_PORT);
  showFrame(FRAME_MQTT_DOTS);

  #if USE_TLS
    wifiClient.setCACert(HIVEMQ_ROOT_CA);
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
  mqttClient.subscribe(TOPIC_COMMAND.c_str(), 1);
  publishStatus("online");
  publishHeartbeat();
  lastHeartbeatMs = millis();

  showFrame(FRAME_MQTT_OK);
  delay(800);
  showFrame(FRAME_IDLE);
}

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

void publishAck(const String& requestId, const String& message) {
  if (!mqttClient.connected()) return;
  StaticJsonDocument<192> doc;
  doc["requestId"] = requestId;
  doc["status"]    = "ack";
  doc["message"]   = message;
  doc["createdAt"] = getIsoTimestamp();
  String out;
  serializeJson(doc, out);
  mqttClient.publish(TOPIC_ACK.c_str(), out.c_str(), false);
  Serial.print(F("[MQTT] TX ACK: ")); Serial.println(out);
}

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

  if (isDispensing) {
    Serial.println(F("[CMD] ⚠️  Rejected: already dispensing!"));
    blinkFrame(FRAME_BLOCKED, 3, 150);
    showFrame(FRAME_DISP_A);

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

  unsigned long now = millis();
  if (String(requestId) == lastRequestId && (now - lastRequestTimeMs) < DUPLICATE_WINDOW_MS) {
    Serial.println(F("[CMD] Duplicate ignored"));
    return;
  }
  lastRequestId     = String(requestId);
  lastRequestTimeMs = now;

  if (String(command) == "feed") {
    Serial.println(F("[CMD] Feed command received"));
    publishAck(String(requestId), "Command received by Feeder");
    dispenseFood(String(requestId), portion, durationMs);
  } else {
    Serial.print(F("[CMD] Unknown command: ")); Serial.println(command);
    publishResponse(String(requestId), false, "Unknown command");
  }
}

void dispenseFood(const String& requestId, int portion, int durationMs) {
  isDispensing = true;
  unsigned long startMs = millis();

  if (durationMs < 200)   durationMs = 200;
  if (durationMs > 15000) durationMs = 15000;

  long holdMs = (long)durationMs * portion;
  showFrame(FRAME_DISP_A);

  if (!feederServo.attached()) {
    Serial.print(F("[SERVO] Attaching on pin ")); Serial.println(SERVO_PIN);
    feederServo.attach(SERVO_PIN, 544, 2400);
    delay(40);
  }

  Serial.print(F("[SERVO] Opening to ")); Serial.print(OPEN_ANGLE); Serial.println(F("°"));
  feederServo.write(OPEN_ANGLE);

  unsigned long holdStart = millis();
  while (millis() - holdStart < (unsigned long)holdMs) {
    mqttClient.loop();
    delay(50);
  }

  Serial.print(F("[SERVO] Closing to ")); Serial.print(CLOSED_ANGLE); Serial.println(F("°"));
  feederServo.write(CLOSED_ANGLE);
  delay(600);

  if (!KEEP_SERVO_ATTACHED) {
    feederServo.detach();
    Serial.println(F("[SERVO] Detached (idle)"));
  } else {
    Serial.println(F("[SERVO] Holding position at closed angle"));
  }

  unsigned long elapsed = millis() - startMs;
  Serial.print(F("[SERVO] Done in ")); Serial.print(elapsed); Serial.println(F(" ms"));

  isDispensing = false;

  // Publish response IMMEDIATELY after servo closes
  publishResponse(requestId, true, "Food dispensed", elapsed);

  showFrame(FRAME_MQTT_OK);
  delay(300);
  showFrame(FRAME_IDLE);

  if (!mqttClient.connected()) {
    mqttConnected = false;
    connectMQTT();
  }
}

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

  mqttClient.publish(TOPIC_RESPONSE.c_str(), out.c_str(), false);
  Serial.print(F("[MQTT] TX response: ")); Serial.println(out);
}

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

void publishStatus(const String& status) {
  if (!mqttClient.connected()) return;

  StaticJsonDocument<128> doc;
  doc["status"]    = status;
  doc["createdAt"] = getIsoTimestamp();

  String out;
  serializeJson(doc, out);

  mqttClient.publish(TOPIC_STATUS.c_str(), out.c_str());
}

void publishError(const String& errorMsg) {
  if (!mqttClient.connected()) return;

  StaticJsonDocument<128> doc;
  doc["error"]     = errorMsg;
  doc["createdAt"] = getIsoTimestamp();

  String out;
  serializeJson(doc, out);

  mqttClient.publish(TOPIC_ERROR.c_str(), out.c_str());
}

String getIsoTimestamp() {
  unsigned long ms = millis();
  unsigned long s  = ms / 1000;
  unsigned long m  = s  / 60;
  unsigned long h  = m  / 60;
  char buf[28];
  snprintf(buf, sizeof(buf), "T+%02lu:%02lu:%02lu.%03lu", h, m % 60, s % 60, ms % 1000);
  return String(buf);
}
