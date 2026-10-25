/*
 * =============================================================================
 *  SmartCat Feeder - Standalone Servo Hardware Diagnostic Test
 * =============================================================================
 *  Use this sketch to test your SG90 / MG995 servo motor directly.
 *  It requires NO Wi-Fi, NO MQTT, and NO internet connection.
 *
 *  Hardware Connections:
 *    Servo ORANGE / YELLOW / WHITE wire  -> Arduino Pin D9
 *    Servo RED wire                     -> 5V (Arduino 5V or external 5V)
 *    Servo BROWN / BLACK wire            -> GND (Arduino GND)
 *    * If using external power: connect External GND to Arduino GND *
 *
 *  How to use:
 *  1. Open Arduino IDE.
 *  2. Select Board: "Arduino UNO R4 WiFi" (or your specific board).
 *  3. Select your COM Port and Upload this sketch.
 *  4. Open Serial Monitor at 115200 baud.
 *  5. Watch the motor rotate back and forth!
 * =============================================================================
 */

#include <Servo.h>

Servo testServo;

const int SERVO_PIN = 9;

void setup() {
  Serial.begin(115200);
  while (!Serial && millis() < 3000); // wait up to 3s for Serial Monitor

  Serial.println(F("=================================================="));
  Serial.println(F("  SMARTCAT FEEDER - SERVO HARDWARE TEST"));
  Serial.println(F("=================================================="));
  Serial.print(F("Attaching servo on digital pin: D"));
  Serial.println(SERVO_PIN);

  // Initialize with standard SG90 pulse limits (544us to 2400us)
  testServo.attach(SERVO_PIN, 544, 2400);
  testServo.write(0);
  delay(1000);

  pinMode(LED_BUILTIN, OUTPUT);
  Serial.println(F("Servo attached. Starting sweep test..."));
  Serial.println(F("You can also type an angle (0 to 180) in the Serial Monitor."));
}

void loop() {
  // Check for manual angle inputs from Serial Monitor
  if (Serial.available() > 0) {
    int angle = Serial.parseInt();
    if (angle >= 0 && angle <= 180) {
      Serial.print(F("Manual input: Moving to "));
      Serial.print(angle);
      Serial.println(F(" degrees"));
      testServo.write(angle);
      delay(500);
      return;
    }
  }

  // Automatic back-and-forth sweep test
  Serial.println(F("\n[TEST] 1. Moving to CLOSED position (0 degrees)..."));
  digitalWrite(LED_BUILTIN, LOW);
  testServo.write(0);
  delay(1500);

  Serial.println(F("[TEST] 2. Moving to HALF-OPEN position (90 degrees)..."));
  digitalWrite(LED_BUILTIN, HIGH);
  testServo.write(90);
  delay(1500);

  Serial.println(F("[TEST] 3. Moving to FULL-OPEN position (160 degrees)..."));
  digitalWrite(LED_BUILTIN, LOW);
  testServo.write(160);
  delay(1500);

  Serial.println(F("[TEST] 4. Returning to CLOSED (0 degrees)..."));
  digitalWrite(LED_BUILTIN, HIGH);
  testServo.write(0);
  delay(2000);
}
