# HARDWARE.md — SmartCat Feeder

> ⚠️ **Safety Notice:** This is a hobby prototype, NOT a certified pet safety device.  
> Always test thoroughly before leaving it unsupervised with a real cat.  
> Monitor daily for jams, power failures, or software bugs.

---

## Required Components

| Component | Qty | Notes |
|---|---|---|
| Arduino UNO R4 WiFi | 1 | Main controller with built-in WiFi |
| SG90 Micro Servo | 1 | Small, 5V compatible, cheap |
| Jumper wires (M-M, M-F) | Several | For servo connection |
| External 5V power supply | 1 (optional) | Phone charger + cut cable |
| Cardboard (medium weight) | 1 sheet | Food hopper and dispenser wheel |
| Bottle cap | 1-2 | To help build the wheel hub |
| Wooden skewers or toothpicks | 2-3 | Structural support for wheel axle |
| Hot glue gun or strong tape | 1 | Assembling the cardboard structure |
| Scissors and craft knife | 1 | Cutting cardboard |
| Small bowl or plate | 1 | For catching dispensed food |
| Dry cat food (kibble) | — | Must be small pieces, not chunks |

---

## Pin Wiring Table

| Part | Wire Color | Arduino UNO R4 Pin |
|---|---|---|
| Servo Signal | Orange / White | **D9** |
| Servo Power (VCC) | Red | **5V** (or external 5V) |
| Servo Ground | Brown / Black | **GND** |
| External power GND | — | **GND** (share with Arduino) |

### Wiring Diagram (Text)

```
Arduino UNO R4 WiFi
─────────────────────────────────
 D9 ────────────── [Servo Signal]
 5V ────────────── [Servo VCC red]  (or external 5V)
GND ────────────── [Servo GND brown]
GND ────────────── [External PSU GND]  ← share if using external power
─────────────────────────────────
USB ─────────────── Computer (programming + serial monitor)
```

> ⚠️ **Power Warning:** The SG90 works from the Arduino 5V pin during testing, but under load it can cause the Arduino to brown out. For reliable operation, use an external 5V supply (USB phone charger, 5V buck converter, or 4xAA batteries) with its GND wired to the Arduino GND.

---

## Cardboard Dispenser Design

### How It Works

A vertical cardboard hopper holds dry cat food.  
A wheel divided into compartments sits at the bottom of the hopper outlet.  
When the servo rotates the wheel, one compartment aligns with the outlet and drops food into a bowl below.

### ASCII Diagram

```
        ┌──────────────────┐
        │  Cardboard Hopper│
        │  (taped walls)   │
        │                  │
        │   Dry Cat Food   │
        │    [kibble]      │
        └────────┬─────────┘
                 │  ← small rectangular outlet cut at bottom
                 ↓
        ┌────────────────┐
        │  Dispenser     │    ← flat cardboard wheel
        │  Wheel         │    ← divided into 4-8 sections
        │  [==|==|==]    │
        └────────┬───────┘
                 │ servo horn attached to center
                 ↓
              [Servo]          ← SG90 mounted below wheel
                 │
                 ↓
              [Bowl]           ← catches food
```

### Step-by-Step Build

**Step 1: Build the Hopper**
1. Cut a rectangular cardboard sheet, fold and tape it into a box shape open at top and bottom.
2. Recommended size: 10cm wide × 10cm deep × 20cm tall.
3. At the bottom, cut a rectangular hole slightly wider than one kibble piece (approx. 1.5cm × 1.5cm).
4. The hopper should funnel food downward toward the outlet.

**Step 2: Build the Dispenser Wheel**
1. Cut a circle of cardboard, diameter ~8cm.
2. Cut 4 to 8 smaller cardboard strips and glue them radially from center to edge, creating compartment walls.
3. The compartments should be large enough to hold 5–10 kibble pieces each.
4. Poke a hole in the center of the wheel.
5. Insert a skewer through the hole as the axle.

**Step 3: Mount the Servo**
1. Glue or tape the SG90 servo below the hopper outlet, facing upward.
2. Attach the servo horn to the center of the wheel.
3. The wheel should sit directly under the hopper outlet.
4. One compartment at a time should face the outlet opening.

**Step 4: Position the Bowl**
1. Place a small bowl or plate directly below the wheel.
2. When the servo rotates, food from one compartment should fall into the bowl.

**Step 5: Test**
1. Plug Arduino into computer via USB.
2. Open Arduino IDE → Serial Monitor at 115200 baud.
3. Type `feed` and press Enter.
4. The servo should rotate to OPEN_ANGLE, pause, then return to CLOSED_ANGLE.
5. Food should drop into the bowl.
6. Adjust `OPEN_ANGLE` and `CLOSED_ANGLE` values if needed.

---

## Servo Configuration

In `smartcat_feeder.ino`, adjust these values:

```cpp
const int CLOSED_ANGLE     = 0;    // Position that blocks food
const int OPEN_ANGLE       = 90;   // Position that opens one compartment
const int FEED_DURATION_MS = 1500; // How long to stay open (milliseconds)
```

- If no food drops: increase `OPEN_ANGLE` or `FEED_DURATION_MS`.
- If too much food drops: decrease `OPEN_ANGLE` or `FEED_DURATION_MS`.
- If servo doesn't return: verify `CLOSED_ANGLE` matches the blocked position.

---

## Testing Steps

1. Upload `smartcat_feeder.ino` to your Arduino UNO R4 WiFi using Arduino IDE.
2. Open Serial Monitor (baud: 115200).
3. Watch for WiFi connection messages.
4. Watch for MQTT connection messages.
5. Type `feed` in Serial Monitor → servo should rotate.
6. From the web dashboard, click **Feed Cat Now** → MQTT command is sent → servo rotates.
7. From Telegram, send `/feed` → same result.
8. Check dashboard for feed log entry.

---

## Troubleshooting

| Problem | Solution |
|---|---|
| Servo not moving | Check D9 wiring. Try `feederServo.write(90)` in setup() to test |
| Servo shaking / jittering | Use external 5V power. The Arduino 5V may not supply enough current |
| Arduino not connecting to WiFi | Verify SSID/password. Try 2.4GHz network (not 5GHz) |
| MQTT not connecting | Check broker host, port (8883), username, and password |
| Dashboard says device offline | Arduino heartbeat not reaching backend. Check WiFi + MQTT logs in Serial Monitor |
| Food stuck | Increase `FEED_DURATION_MS`. Shake hopper. Make outlet hole larger |
| Too much food dispensing | Decrease `OPEN_ANGLE` so wheel moves less |
| No food dispensing | Verify wheel compartments are aligned with outlet. Increase `OPEN_ANGLE` |
| Serial Monitor shows garbage text | Set baud rate to 115200 in Serial Monitor |
| Can't upload to Arduino | Install Arduino UNO R4 board package in Board Manager |

---

## Required Arduino Libraries

Install these in Arduino IDE (Sketch → Include Library → Manage Libraries):

| Library | Version |
|---|---|
| WiFiS3 | Built-in for UNO R4 WiFi (no install needed) |
| ArduinoMqttClient | Search "ArduinoMqttClient" by Arduino |
| Servo | Built-in (no install needed) |
| ArduinoJson | Search "ArduinoJson" by Benoit Blanchon |

---

## Power Options

| Option | Pros | Cons |
|---|---|---|
| USB from computer | Easy, free | Not portable |
| USB power bank | Portable | Must recharge |
| 5V phone charger | Always on | Requires wall outlet |
| 4xAA battery pack | Standalone | Short battery life |

**Recommended:** Power the Arduino via USB wall adapter. Use separate 5V supply for servo if needed.
