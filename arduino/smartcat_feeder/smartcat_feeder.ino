/*
 * =============================================================================
 *  SmartCat Feeder - Arduino UNO R4 WiFi Firmware  v2.1 (LOCAL READY-TO-FLASH BACKUP)
 * =============================================================================
 *  This file contains your actual local Wi-Fi and HiveMQ credentials pre-configured.
 *  It is stored inside "arduino/local_config/" which is IGNORED BY GIT.
 *  You can open this file in Arduino IDE anytime to flash your UNO R4 board directly.
 * =============================================================================
 */
#include <WiFiS3.h>
#define MQTT_MAX_PACKET_SIZE 512
#include <PubSubClient.h>
#include <Servo.h>
#include <ArduinoJson.h>
#include <Arduino_LED_Matrix.h>
ArduinoLEDMatrix matrix;
// =============================================================================
//  ⚙️  USER CONFIGURATION — Real Credentials Pre-Configured
// =============================================================================
char WIFI_SSID[]     = "GCM";
char WIFI_PASSWORD[] = "geo@****";
// ── MQTT ──────────────────────────────────────────────────────────────────────
#define USE_TLS true
#if USE_TLS
  const char MQTT_BROKER[]   = "1929ae9bc33d4ba29b4aa4f909c3ef85.s1.eu.hivemq.cloud";
  const int  MQTT_PORT       = 8883;
  const char MQTT_USERNAME[] = "geo123";
  const char MQTT_PASSWORD[] = "GeoCatFeeder2026";
#else
  const char MQTT_BROKER[]   = "broker.emqx.io";
  const int  MQTT_PORT       = 1883;
  const char MQTT_USERNAME[] = "";